use std::sync::Arc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use crate::{agent_os, config, executor};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct StepRecord {
    pub tool: String,
    pub input: Value,
    pub output: String,
    pub success: bool,
    pub duration_ms: u64,
}

#[derive(Debug, Deserialize)]
struct ReflectionResponse {
    updates: Vec<PillarUpdate>,
}

#[derive(Debug, Deserialize)]
struct PillarUpdate {
    pillar: String,
    content: String,
}

/// Analyze the interaction and update brain if something new was learned
pub async fn reflect_and_evolve(
    goal: &str,
    steps_executed: &[StepRecord],
    success: bool,
    agent_os: &mut agent_os::AgentOS,
    executor_registry: &Arc<executor::Registry>,
    config: &'static config::NodeConfig,
) -> anyhow::Result<bool> {
    
    if steps_executed.is_empty() {
        return Ok(false);
    }

    // Build the reflection prompt
    let steps_summary = steps_executed
        .iter()
        .map(|s| format!("- {}: {} ({}ms, success: {})", 
            s.tool, 
            truncate_json(&s.input), 
            s.duration_ms,
            s.success
        ))
        .collect::<Vec<_>>()
        .join("\n");

    let prompt = format!(r#"
You are analyzing an agent interaction to determine if the brain (MD files) should be updated.

## Current Interaction
Goal: {}
Success: {}
Steps executed: {}

## What Happened
{}

## Your Task

Review the interaction and determine if any of these should be updated:

1. **MEMORY.md**: New user preferences, successful patterns, lessons learned
2. **PLAYBOOKS.md**: New reusable workflows discovered
3. **SKILLS.md**: New capabilities, timing/cost data, fallback patterns
4. **IDENTITY.md**: If personality/voice evolved
5. **SOUL.md**: If core purpose/principles clarified (rare)

## Output Format

Respond with JSON only (no other text):
{{"updates": [
  {{"pillar": "memory", "content": "What to add to MEMORY.md"}},
  {{"pillar": "playbooks", "content": "New playbook to add"}}
]}}

If NO updates needed, respond:
{{"updates": []}}

Be conservative - only update if there's genuinely new learning.
Be specific - include actual details (tool names, timings, user preferences).
"#,
        goal,
        success,
        steps_executed.len(),
        steps_summary
    );

    // Call LLM to analyze
    let input = serde_json::json!({
        "messages": [
            {
                "role": "system", 
                "content": "You are a reflection assistant. Analyze interactions and suggest brain updates. Always respond with valid JSON."
            },
            {"role": "user", "content": prompt}
        ]
    });
    
    let executor_registry = Arc::clone(executor_registry);
    let result = tokio::task::spawn_blocking(move || {
        let executor = executor_registry
            .get("llm.chat")
            .ok_or_else(|| anyhow::anyhow!("LLM executor not found"))?;
        Ok::<_, anyhow::Error>(executor.execute(input, config))
    })
    .await??;
    
    let content = match result {
        executor::ExecutorResult::Executed { output, .. } => {
            output["content"].as_str().unwrap_or("{}").to_string()
        }
        _ => return Ok(false),
    };
    
    // Parse the response (try to extract JSON from potential markdown)
    let json_content = extract_json_from_content(&content);
    let suggested: ReflectionResponse = match serde_json::from_str(&json_content) {
        Ok(v) => v,
        Err(e) => {
            tracing::warn!("Reflection parse failed: {}, content: {}", e, json_content);
            return Ok(false);
        }
    };
    
    let mut has_updates = false;
    
    for update in suggested.updates {
        if !update.pillar.is_empty() && !update.content.is_empty() {
            tracing::info!("🧠 Updating {} with new learning", update.pillar);
            
            // Append to existing content with timestamp
            let timestamp = chrono::Local::now().format("%Y-%m-%d");
            let formatted_update = format!("## Learning Update - {}\n\n{}", timestamp, update.content);
            
            agent_os.update_pillar(&update.pillar, &formatted_update);
            has_updates = true;
        }
    }
    
    if has_updates {
        agent_os.save()?;
        tracing::info!("✅ Brain evolution complete");
    }
    
    Ok(has_updates)
}

fn truncate_json(value: &Value) -> String {
    let s = value.to_string();
    if s.len() > 100 {
        format!("{}...", &s[..100])
    } else {
        s
    }
}

fn extract_json_from_content(content: &str) -> String {
    // Try to find JSON in markdown code blocks
    if let Some(block_start) = content.find("```json") {
        let after_marker = block_start + 7; // length of "```json"
        if after_marker < content.len() {
            // Find the closing ``` after the opening marker
            if let Some(relative_end) = content[after_marker..].find("```") {
                let json_content = &content[after_marker..after_marker + relative_end];
                return json_content.trim().to_string();
            }
        }
    }
    
    // Try to find raw JSON
    if let Some(start) = content.find('{') {
        if let Some(end) = content.rfind('}') {
            if end >= start {
                return content[start..=end].to_string();
            }
        }
    }
    
    content.to_string()
}

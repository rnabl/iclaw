/**
 * Autonomous Job Polling and Notification
 * 
 * This module handles the polling loop that monitors job progress
 * and sends real-time updates to Telegram.
 */

use std::sync::Arc;
use std::time::Duration;
use crate::channels::{Channel, OutgoingMessage, ChannelType};
use crate::autonomous_jobs::{poll_job_status, get_job_results, generate_recovery_plan};

pub struct JobPoller {
    job_id: String,
    channel_id: String,
    channel_type: ChannelType,
    harness_url: String,
    last_step: i32,
}

impl JobPoller {
    pub fn new(
        job_id: String,
        channel_id: String,
        channel_type: ChannelType,
        harness_url: String,
    ) -> Self {
        Self {
            job_id,
            channel_id,
            channel_type,
            harness_url,
            last_step: 0,
        }
    }

    /// Poll for updates and send notifications
    /// Returns true when job is complete
    pub async fn poll_and_notify<C: Channel + Clone + Send + Sync>(
        &mut self,
        channel: Arc<C>,
    ) -> anyhow::Result<bool> {
        let status = poll_job_status(&self.job_id, &self.harness_url).await?;
        
        let job_status = status["status"].as_str().unwrap_or("unknown");
        let current_step = status["currentStep"].as_i64().unwrap_or(0) as i32;
        let total_steps = status["totalSteps"].as_i64().unwrap_or(1) as i32;
        
        // Send progress update if step changed
        if current_step > self.last_step && current_step <= total_steps {
            if let Some(steps) = status["steps"].as_array() {
                if let Some(step) = steps.get((current_step - 1) as usize) {
                    let action = step["action"].as_str().unwrap_or("unknown");
                    let step_status = step["status"].as_str().unwrap_or("unknown");
                    
                    let emoji = match action {
                        "discover" => "🔍",
                        "filter" => "🎯",
                        "enrich" => "📞",
                        "audit" => "🌐",
                        "analyze" => "📊",
                        "draft-email" => "✉️",
                        _ => "⚙️",
                    };
                    
                    let message = if step_status == "completed" {
                        format!(
                            "{} {} complete! ({}/{})",
                            emoji,
                            capitalize_first(action),
                            current_step,
                            total_steps
                        )
                    } else {
                        format!(
                            "{} {} in progress... ({}/{})",
                            emoji,
                            capitalize_first(action),
                            current_step,
                            total_steps
                        )
                    };
                    
                    channel.send(OutgoingMessage {
                        channel_type: self.channel_type.clone(),
                        channel_id: self.channel_id.clone(),
                        content: message,
                        reply_to: None,
                        metadata: serde_json::json!({}),
                    }).await?;
                }
            }
            
            self.last_step = current_step;
        }
        
        // Check if job is complete
        match job_status {
            "completed" => {
                channel.send(OutgoingMessage {
                    channel_type: self.channel_type.clone(),
                    channel_id: self.channel_id.clone(),
                    content: "✅ Job completed! Fetching results...".to_string(),
                    reply_to: None,
                    metadata: serde_json::json!({}),
                }).await?;
                Ok(true)
            }
            "failed" => {
                let error = status["error"].as_str().unwrap_or("Unknown error");
                channel.send(OutgoingMessage {
                    channel_type: self.channel_type.clone(),
                    channel_id: self.channel_id.clone(),
                    content: format!("❌ Job failed: {}", error),
                    reply_to: None,
                    metadata: serde_json::json!({}),
                }).await?;
                Ok(true)
            }
            "cancelled" => {
                channel.send(OutgoingMessage {
                    channel_type: self.channel_type.clone(),
                    channel_id: self.channel_id.clone(),
                    content: "🛑 Job was cancelled".to_string(),
                    reply_to: None,
                    metadata: serde_json::json!({}),
                }).await?;
                Ok(true)
            }
            _ => Ok(false), // Still running
        }
    }

    /// Main polling loop - runs until job completes
    pub async fn run_until_complete<C: Channel + Clone + Send + Sync + 'static>(
        mut self,
        channel: Arc<C>,
    ) -> anyhow::Result<serde_json::Value> {
        loop {
            match self.poll_and_notify(channel.clone()).await {
                Ok(true) => {
                    // Job complete, fetch final results
                    return get_job_results(&self.job_id, &self.harness_url).await;
                }
                Ok(false) => {
                    // Still running, wait before next poll
                    tokio::time::sleep(Duration::from_secs(3)).await;
                }
                Err(e) => {
                    tracing::error!("Polling error: {}", e);
                    tokio::time::sleep(Duration::from_secs(5)).await;
                }
            }
        }
    }
}

fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

/// Format job results for Telegram display
pub fn format_job_results(results: &serde_json::Value) -> String {
    let mut output = String::from("📊 **Job Results**\n\n");
    
    // Format job info
    if let Some(job) = results["job"].as_object() {
        if let Some(desc) = job["description"].as_str() {
            output.push_str(&format!("**Task**: {}\n", desc));
        }
        if let Some(status) = job["status"].as_str() {
            output.push_str(&format!("**Status**: {}\n", status));
        }
        output.push_str("\n");
    }
    
    // Format businesses
    if let Some(businesses) = results["businesses"].as_array() {
        if !businesses.is_empty() {
            output.push_str(&format!("🏢 **Found {} Businesses:**\n\n", businesses.len()));
            
            for (i, business) in businesses.iter().take(10).enumerate() {
                let name = business["name"].as_str().unwrap_or("Unknown");
                let rating = business["rating"].as_f64();
                let reviews = business["reviewCount"].as_i64();
                let phone = business["phone"].as_str();
                let website = business["website"].as_str();
                
                output.push_str(&format!("{}. **{}**", i + 1, name));
                
                if let Some(r) = rating {
                    output.push_str(&format!(" ⭐ {:.1}", r));
                }
                if let Some(rev) = reviews {
                    output.push_str(&format!(" ({} reviews)", rev));
                }
                output.push('\n');
                
                if let Some(p) = phone {
                    output.push_str(&format!("   📞 {}\n", p));
                }
                if let Some(w) = website {
                    output.push_str(&format!("   🌐 {}\n", w));
                }
                output.push('\n');
            }
            
            if businesses.len() > 10 {
                output.push_str(&format!("...and {} more\n\n", businesses.len() - 10));
            }
        }
    }
    
    // Format contacts
    if let Some(contacts) = results["contacts"].as_array() {
        if !contacts.is_empty() {
            output.push_str(&format!("📇 **Found {} Contacts:**\n\n", contacts.len()));
            
            for (i, contact) in contacts.iter().take(10).enumerate() {
                let name = contact["name"].as_str();
                let email = contact["email"].as_str();
                let phone = contact["phone"].as_str();
                let role = contact["role"].as_str();
                
                if let Some(n) = name {
                    output.push_str(&format!("{}. **{}**", i + 1, n));
                    if let Some(r) = role {
                        output.push_str(&format!(" ({})", r));
                    }
                    output.push('\n');
                }
                
                if let Some(e) = email {
                    output.push_str(&format!("   ✉️ {}\n", e));
                }
                if let Some(p) = phone {
                    output.push_str(&format!("   📞 {}\n", p));
                }
                output.push('\n');
            }
            
            if contacts.len() > 10 {
                output.push_str(&format!("...and {} more\n\n", contacts.len() - 10));
            }
        }
    }
    
    output
}

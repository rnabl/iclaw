//! Telegram Channel Handler
//!
//! Connects to Telegram Bot API using long polling to receive messages
//! and send responses back to users.

use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::sync::mpsc;
use tracing::{error, info, warn};

use super::{Channel, ChannelType, IncomingMessage, OutgoingMessage};

#[derive(Debug, Clone)]
pub struct TelegramChannel {
    bot_token: String,
    base_url: String,
    offset: std::sync::Arc<tokio::sync::Mutex<i64>>,
}

#[derive(Debug, Deserialize)]
struct TelegramUpdate {
    update_id: i64,
    message: Option<TelegramMessage>,
}

#[derive(Debug, Deserialize, Serialize)]
struct TelegramMessage {
    message_id: i64,
    from: TelegramUser,
    chat: TelegramChat,
    text: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct TelegramUser {
    id: i64,
    first_name: String,
    username: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct TelegramChat {
    id: i64,
    #[serde(rename = "type")]
    chat_type: String,
}

#[derive(Debug, Serialize)]
struct SendMessageRequest {
    chat_id: i64,
    text: String,
    parse_mode: Option<String>,
}

impl TelegramChannel {
    pub fn new(bot_token: String) -> Self {
        Self {
            base_url: "https://api.telegram.org".to_string(),
            bot_token,
            offset: std::sync::Arc::new(tokio::sync::Mutex::new(0)),
        }
    }

    async fn get_updates(&self) -> Result<Vec<TelegramUpdate>> {
        let offset = *self.offset.lock().await;
        let url = format!(
            "{}/bot{}/getUpdates?offset={}&timeout=30",
            self.base_url, self.bot_token, offset
        );

        let client = reqwest::Client::new();
        let response = client.get(&url).send().await?;
        let body: Value = response.json().await?;

        if body["ok"].as_bool() != Some(true) {
            anyhow::bail!("Telegram API error: {:?}", body);
        }

        let updates: Vec<TelegramUpdate> = serde_json::from_value(body["result"].clone())?;

        // Update offset to mark these messages as processed
        if let Some(last_update) = updates.last() {
            *self.offset.lock().await = last_update.update_id + 1;
        }

        Ok(updates)
    }

    async fn send_message(&self, chat_id: i64, text: String) -> Result<()> {
        let url = format!("{}/bot{}/sendMessage", self.base_url, self.bot_token);

        let request = SendMessageRequest {
            chat_id,
            text,
            parse_mode: Some("Markdown".to_string()),
        };

        let client = reqwest::Client::new();
        let response = client.post(&url).json(&request).send().await?;
        let body: Value = response.json().await?;

        if body["ok"].as_bool() != Some(true) {
            anyhow::bail!("Failed to send message: {:?}", body);
        }

        Ok(())
    }
}

#[async_trait]
impl Channel for TelegramChannel {
    fn channel_type(&self) -> ChannelType {
        ChannelType::Telegram
    }

    async fn start(&self, tx: mpsc::Sender<IncomingMessage>) -> Result<()> {
        info!("🤖 Starting Telegram bot...");

        // Test connection
        let url = format!("{}/bot{}/getMe", self.base_url, self.bot_token);
        let client = reqwest::Client::new();
        let response = client.get(&url).send().await?;
        let body: Value = response.json().await?;

        if body["ok"].as_bool() != Some(true) {
            anyhow::bail!("Invalid Telegram bot token");
        }

        let bot_username = body["result"]["username"]
            .as_str()
            .unwrap_or("unknown");
        info!("✅ Telegram bot connected: @{}", bot_username);

        // Start polling loop
        loop {
            match self.get_updates().await {
                Ok(updates) => {
                    for update in updates {
                        if let Some(msg) = update.message {
                            if let Some(text) = msg.text {
                                // Handle /start command
                                if text.starts_with("/start") {
                                    let _ = self
                                        .send_message(
                                            msg.chat.id,
                                            "🦞 **OneClaw Agent Online**\n\nSend me a message to get started!".to_string(),
                                        )
                                        .await;
                                    continue;
                                }

                                let channel_msg = IncomingMessage {
                                    channel_type: ChannelType::Telegram,
                                    channel_id: msg.chat.id.to_string(),
                                    provider_user_id: msg.from.id.to_string(),
                                    username: msg.from.username.clone(),
                                    content: text.clone(),
                                    timestamp: chrono::Utc::now(),
                                    reply_to: None,
                                    metadata: serde_json::to_value(&msg).unwrap_or_default(),
                                };

                                info!(
                                    "📨 Message from @{}: {}",
                                    msg.from.username.as_deref().unwrap_or("unknown"),
                                    text
                                );

                                // Send to conversation handler
                                if let Err(e) = tx.send(channel_msg).await {
                                    error!("Failed to send message to handler: {}", e);
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    warn!("Error polling Telegram updates: {}", e);
                    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                }
            }
        }
    }

    async fn send(&self, msg: OutgoingMessage) -> Result<()> {
        let chat_id: i64 = msg.channel_id.parse()?;
        self.send_message(chat_id, msg.content).await
    }

    async fn stop(&self) -> Result<()> {
        info!("🛑 Stopping Telegram bot...");
        Ok(())
    }
}

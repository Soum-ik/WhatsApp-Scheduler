import { scheduleMessage, cancelScheduledMessage } from "../scheduler/queue";
import {
  insertScheduledMessage,
  getScheduledMessages,
  getMessageById,
  deleteMessage,
  updateMessageJobId,
} from "../db";
import { isWhatsAppConnected } from "../whatsapp/client";
import { sendMessage } from "../whatsapp/sender";

/**
 * Handle POST /api/schedule - Schedule a new message
 */
export const handleScheduleMessage = async (req: Request) => {
  try {
    const body = await req.json();
    const { phoneNumber, message, scheduledTime } = body;

    
    // Validation
    if (!phoneNumber || !message || !scheduledTime) {
      return Response.json(
        { error: "Missing required fields: phoneNumber, message, scheduledTime" },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate.getTime() <= Date.now()) {
      return Response.json(
        { error: "Scheduled time must be in the future" },
        { status: 400 }
      );
    }

    const { id: messageId } = await insertScheduledMessage({
      phone_number: phoneNumber,
      message,
      scheduled_time: scheduledDate.toISOString(),
      status: "pending",
    });

    const jobId = await scheduleMessage(
      { messageId, phoneNumber, message },
      scheduledDate
    );

    if (!jobId) {
      throw new Error("Failed to create BullMQ job");
    }

    await updateMessageJobId(messageId, jobId);

    return Response.json({
      success: true,
      messageId,
      jobId,
      scheduledTime: scheduledDate.toISOString(),
    });
  } catch (error: any) {
    console.error("Error scheduling message:", error);
    return Response.json(
      { error: error.message || "Failed to schedule message" },
      { status: 500 }
    );
  }
};

/**
 * Handle GET /api/messages - Get all scheduled messages
 */
export const handleGetMessages = async (req: Request) => {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;

    const messages = await getScheduledMessages(status);

    return Response.json({
      success: true,
      messages,
      count: messages.length,
    });
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return Response.json(
      { error: error.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
};

/**
 * Handle GET /api/messages/:id - Get a specific message
 */
export const handleGetMessage = async (req: Request, params: { id: string }) => {
  try {
    const messageId = parseInt(params.id);
    const message = await getMessageById(messageId);

    if (!message) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    return Response.json({ success: true, message });
  } catch (error: any) {
    console.error("Error fetching message:", error);
    return Response.json(
      { error: error.message || "Failed to fetch message" },
      { status: 500 }
    );
  }
};

/**
 * Handle DELETE /api/messages/:id - Cancel and delete a scheduled message
 */
export const handleDeleteMessage = async (req: Request, params: { id: string }) => {
  try {
    const messageId = parseInt(params.id);
    const message = await getMessageById(messageId);

    if (!message) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.job_id && message.status === "pending") {
      try {
        await cancelScheduledMessage(message.job_id);
      } catch (error) {
        console.warn("Could not cancel job:", error);
      }
    }

    await deleteMessage(messageId);

    return Response.json({ success: true, message: "Message deleted" });
  } catch (error: any) {
    console.error("Error deleting message:", error);
    return Response.json(
      { error: error.message || "Failed to delete message" },
      { status: 500 }
    );
  }
};

/**
 * Handle POST /api/send - Send an immediate message (no scheduling)
 */
export const handleSendNow = async (req: Request) => {
  try {
    const body = await req.json();
    const { phoneNumber, message } = body;
    console.log("Received send now request:", { phoneNumber, message });

    if (!phoneNumber || !message) {
      return Response.json(
        { error: "Missing required fields: phoneNumber, message" },
        { status: 400 }
      );
    }

    if (!isWhatsAppConnected()) {
      console.warn("WhatsApp is not connected. Cannot send message.");
      return Response.json(
        { error: "WhatsApp is not connected" },
        { status: 503 }
      );
    }


    await sendMessage({ phoneNumber, message });

    return Response.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error: any) {
    console.error("Error sending message:", error);
    return Response.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
};

/**
 * Handle GET /api/status - Get WhatsApp connection status
 */
export const handleGetStatus = async (req: Request) => {
  return Response.json({
    success: true,
    whatsappConnected: isWhatsAppConnected(),
  });
};

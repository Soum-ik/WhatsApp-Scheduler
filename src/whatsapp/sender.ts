import { getSocket, isWhatsAppConnected } from "./client";

export interface SendMessageOptions {
  phoneNumber: string;
  message: string;
}

/**
 * Format phone number to WhatsApp JID format
 * @param phoneNumber - Phone number in format like "1234567890" or "+1234567890"
 * @returns Formatted JID like "1234567890@s.whatsapp.net"
 */
const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, "");
  return `${cleaned}@s.whatsapp.net`;
};

/**
 * Send a WhatsApp message
 * @param options - Message options containing phone number and message text
 * @returns Promise that resolves when message is sent
 */
export const sendMessage = async (options: SendMessageOptions) => {
  if (!isWhatsAppConnected()) {
    throw new Error("WhatsApp is not connected. Please connect first.");
  }

  const socket = getSocket();
  const jid = formatPhoneNumber(options.phoneNumber);

  try {
    await socket.sendMessage(jid, { text: options.message });
    console.log(`✅ Message sent to ${options.phoneNumber}`);
    return { success: true, phoneNumber: options.phoneNumber };
  } catch (error) {
    console.error(`❌ Failed to send message to ${options.phoneNumber}:`, error);
    throw error;
  }
};


// This file extends the Window interface to include Twilio
import { Device } from 'twilio-client';

declare global {
  interface Window {
    Twilio: {
      Device: typeof Device;
      [key: string]: any;
    };
  }
}

export {};

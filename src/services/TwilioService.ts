// src/services/TwilioService.ts
import { supabase } from '@/integrations/supabase/client';
import { Device } from 'twilio-client';

export type CallStatus = 'idle' | 'connecting' | 'ringing' | 'in-progress' | 'completed' | 'failed';

export interface CallState {
  status: CallStatus;
  connection: any | null;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  callSid: string | null;
  startTime: Date | null;
  endTime: Date | null;
  duration: number;
  muted: boolean;
  error: string | null;
}

class TwilioService {
  private device: Device | null = null;
  private token: string | null = null;
  private workerId: string | null = null;
  private callListeners: Array<(state: CallState) => void> = [];
  private callState: CallState = {
    status: 'idle',
    connection: null,
    phoneNumber: '',
    direction: 'outbound',
    callSid: null,
    startTime: null,
    endTime: null,
    duration: 0,
    muted: false,
    error: null
  };
  
  // Timer for tracking call duration
  private durationTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    // Load the Twilio script dynamically
    this.loadTwilioScript();
  }
  
  private loadTwilioScript(): void {
    if (typeof window === 'undefined') return;
    
    if (!document.getElementById('twilio-js')) {
      const script = document.createElement('script');
      script.id = 'twilio-js';
      script.src = 'https://sdk.twilio.com/js/client/v1.14/twilio.js';
      script.async = true;
      script.onload = () => {
        console.log('Twilio script loaded');
      };
      document.body.appendChild(script);
    }
  }
  
  async setupDevice(): Promise<boolean> {
    try {
      // Get a new token from the server
      const token = await this.getToken();
      
      if (!token) {
        console.error('Failed to get Twilio token');
        return false;
      }
      
      // Make sure Twilio script is loaded and Device is available
      if (typeof window === 'undefined' || !window.Twilio || !window.Twilio.Device) {
        console.error('Twilio Device is not defined. Script may not be loaded yet.');
        return false;
      }
      
      // Use a try-catch when creating the Device to catch any initialization issues
      try {
        // Use window.Twilio.Device constructor directly
        this.device = new window.Twilio.Device(token, {
          debug: true,
          enableRingingState: true
        });
        
        // Register event handlers
        this.device.on('ready', this.handleDeviceReady.bind(this));
        this.device.on('error', this.handleDeviceError.bind(this));
        this.device.on('incoming', this.handleIncomingCall.bind(this));
        this.device.on('cancel', this.handleCancelledCall.bind(this));
        
        return true;
      } catch (deviceError) {
        console.error('Error initializing Twilio Device:', deviceError);
        this.updateCallState({
          status: 'idle',
          error: deviceError instanceof Error ? deviceError.message : 'Error initializing Twilio device'
        });
        return false;
      }
    } catch (error) {
      console.error('Error setting up Twilio device:', error);
      this.updateCallState({
        status: 'idle',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
  
  async getToken(): Promise<string | null> {
    try {
      // Direct API call to avoid edge function errors
      const session = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://knoevkvjyuchhcmzsdpq.supabase.co';
      
      const response = await fetch(`${supabaseUrl}/functions/v1/twilio-voice-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session?.access_token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get token: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.token) {
        throw new Error('No token returned');
      }
      
      this.token = data.token;
      this.workerId = data.workerId;
      return data.token;
    } catch (error) {
      console.error('Error getting Twilio token:', error);
      return null;
    }
  }
  
  // Register a worker with Twilio
  async registerWorker(attributes = {}): Promise<string | null> {
    // This is now handled in the TwilioContext
    // We'll keep this method for compatibility
    return "worker-registered";
  }
  
  // Update agent voice status
  async updateVoiceStatus(status: 'available' | 'offline'): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        console.error('User not authenticated');
        return false;
      }
      
      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ voice_status: status })
        .eq('id', userData.user.id);
        
      if (updateError) {
        console.error('Error updating voice status in database:', updateError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating voice status:', error);
      return false;
    }
  }
  
  // Make an outbound call
  async makeCall(phoneNumber: string, params = {}): Promise<boolean> {
    if (!this.device) {
      await this.setupDevice();
    }
    
    if (!this.device) {
      console.error('Twilio device not initialized');
      return false;
    }
    
    try {
      this.updateCallState({
        status: 'connecting',
        phoneNumber,
        direction: 'outbound',
        startTime: new Date(),
        endTime: null,
        duration: 0,
        callSid: null,
        error: null
      });
      
      // Make sure we pass the parameters correctly as a flat object with string keys and values
      const connectParams: Record<string, string> = {
        To: phoneNumber
      };
      
      // Add any additional parameters, ensuring they are string values
      if (params && typeof params === 'object') {
        Object.keys(params).forEach(key => {
          const value = params[key];
          if (value !== undefined && value !== null) {
            connectParams[key] = String(value);
          }
        });
      }
      
      console.log('Connecting with params:', connectParams);
      
      // Make sure we have a Device instance before trying to connect
      if (!this.device) {
        throw new Error('Device is not initialized');
      }
      
      const connection = await this.device.connect(connectParams);
      
      if (!connection) {
        throw new Error('Failed to establish connection');
      }
      
      this.setupConnectionHandlers(connection);
      this.updateCallState({
        connection,
        status: 'ringing'
      });
      
      return true;
    } catch (error) {
      console.error('Error making call:', error);
      this.updateCallState({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error making call'
      });
      return false;
    }
  }
  
  // Answer an incoming call
  acceptIncomingCall(): boolean {
    if (!this.callState.connection) {
      console.error('No incoming call to accept');
      return false;
    }
    
    try {
      this.callState.connection.accept();
      this.updateCallState({
        status: 'in-progress'
      });
      this.startDurationTimer();
      return true;
    } catch (error) {
      console.error('Error accepting call:', error);
      this.updateCallState({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
  
  // Reject an incoming call
  rejectIncomingCall(): boolean {
    if (!this.callState.connection) {
      console.error('No incoming call to reject');
      return false;
    }
    
    try {
      this.callState.connection.reject();
      this.updateCallState({
        status: 'idle',
        connection: null
      });
      return true;
    } catch (error) {
      console.error('Error rejecting call:', error);
      return false;
    }
  }
  
  // End the current call
  endCall(): boolean {
    if (!this.callState.connection) {
      console.error('No active call to end');
      return false;
    }
    
    try {
      this.callState.connection.disconnect();
      this.updateCallState({
        status: 'completed',
        endTime: new Date(),
        connection: null
      });
      this.stopDurationTimer();
      return true;
    } catch (error) {
      console.error('Error ending call:', error);
      return false;
    }
  }
  
  // Mute/unmute the current call
  toggleMute(): boolean {
    if (!this.callState.connection) {
      console.error('No active call to mute');
      return false;
    }
    
    try {
      const newMuteState = !this.callState.muted;
      this.callState.connection.mute(newMuteState);
      this.updateCallState({
        muted: newMuteState
      });
      return true;
    } catch (error) {
      console.error('Error toggling mute:', error);
      return false;
    }
  }
  
  // Send DTMF tones
  sendDigit(digit: string): boolean {
    if (!this.callState.connection) {
      console.error('No active call to send digit');
      return false;
    }
    
    try {
      this.callState.connection.sendDigits(digit);
      return true;
    } catch (error) {
      console.error('Error sending digit:', error);
      return false;
    }
  }
  
  // Event handlers
  private handleDeviceReady(): void {
    console.log('Twilio device is ready');
  }
  
  private handleDeviceError(error: any): void {
    console.error('Twilio device error:', error);
    this.updateCallState({
      status: 'failed',
      error: error.message || 'Unknown Twilio device error'
    });
  }
  
  private handleIncomingCall(connection: any): void {
    console.log('Incoming call', connection);
    
    // Extract phone number from connection parameters
    const params = connection.parameters || {};
    const phoneNumber = params.From || 'Unknown';
    
    this.updateCallState({
      status: 'ringing',
      connection,
      phoneNumber,
      direction: 'inbound',
      callSid: connection.parameters?.CallSid || null
    });
    
    this.setupConnectionHandlers(connection);
  }
  
  private handleCancelledCall(): void {
    console.log('Call was cancelled');
    this.updateCallState({
      status: 'idle',
      connection: null
    });
    this.stopDurationTimer();
  }
  
  private setupConnectionHandlers(connection: any): void {
    connection.on('accept', this.handleConnectionAccepted.bind(this));
    connection.on('disconnect', this.handleConnectionDisconnected.bind(this));
    connection.on('error', this.handleConnectionError.bind(this));
    connection.on('reject', this.handleConnectionRejected.bind(this));
  }
  
  private handleConnectionAccepted(): void {
    console.log('Call accepted');
    this.updateCallState({
      status: 'in-progress',
      startTime: new Date()
    });
    this.startDurationTimer();
    
    // Record the call in the database
    this.recordCallInDatabase('in-progress').catch(err => {
      console.error('Error recording call in database:', err);
    });
  }
  
  private handleConnectionDisconnected(): void {
    console.log('Call disconnected');
    this.updateCallState({
      status: 'completed',
      endTime: new Date(),
      connection: null
    });
    this.stopDurationTimer();
    
    // Update the call record in the database
    this.recordCallInDatabase('completed').catch(err => {
      console.error('Error updating call record in database:', err);
    });
  }
  
  private handleConnectionError(error: any): void {
    console.error('Connection error:', error);
    this.updateCallState({
      status: 'failed',
      error: error.message,
      connection: null
    });
    this.stopDurationTimer();
  }
  
  private handleConnectionRejected(): void {
    console.log('Call rejected');
    this.updateCallState({
      status: 'idle',
      connection: null
    });
  }
  
  // Update the call state and notify listeners
  private updateCallState(partialState: Partial<CallState>): void {
    this.callState = {
      ...this.callState,
      ...partialState
    };
    
    this.notifyListeners();
  }
  
  // Start the duration timer
  private startDurationTimer(): void {
    this.stopDurationTimer();
    
    this.durationTimer = setInterval(() => {
      if (this.callState.status === 'in-progress' && this.callState.startTime) {
        const duration = Math.floor((Date.now() - this.callState.startTime.getTime()) / 1000);
        this.updateCallState({ duration });
      }
    }, 1000);
  }
  
  // Stop the duration timer
  private stopDurationTimer(): void {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }
  
  // Record or update call in the database
  private async recordCallInDatabase(status: string): Promise<void> {
    if (!this.callState.callSid) return;
    
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) return;
    
    try {
      // Check if this call already exists in the database
      const { data: existingCall } = await supabase
        .from('call_sessions')
        .select('id')
        .eq('call_sid', this.callState.callSid)
        .single();
        
      const durationSeconds = this.callState.duration;
      const endedAt = status === 'completed' ? new Date().toISOString() : null;
        
      if (existingCall) {
        // Update existing call record
        await supabase
          .from('call_sessions')
          .update({
            status,
            agent_id: userData.user.id,
            ended_at: endedAt,
            duration_seconds: durationSeconds
          })
          .eq('call_sid', this.callState.callSid);
      } else {
        // Create new call record
        await supabase
          .from('call_sessions')
          .insert({
            call_sid: this.callState.callSid,
            status,
            agent_id: userData.user.id,
            direction: this.callState.direction,
            started_at: this.callState.startTime?.toISOString(),
            ended_at: endedAt,
            duration_seconds: durationSeconds,
            endkunde_phone: this.callState.phoneNumber
          });
      }
    } catch (error) {
      console.error('Error recording call in database:', error);
    }
  }
  
  // Subscribe to call state changes
  onCallStateChange(callback: (state: CallState) => void): () => void {
    this.callListeners.push(callback);
    
    // Immediately notify with current state
    try {
      callback(this.callState);
    } catch (error) {
      console.error('Error in initial call state listener notification:', error);
    }
    
    // Return unsubscribe function
    return () => {
      this.callListeners = this.callListeners.filter(cb => cb !== callback);
    };
  }
  
  // Notify all listeners
  private notifyListeners(): void {
    this.callListeners.forEach(callback => {
      try {
        callback(this.callState);
      } catch (error) {
        console.error('Error in call state listener:', error);
      }
    });
  }
  
  // Get the current call state
  getCallState(): CallState {
    return this.callState;
  }
  
  // Clean up resources
  destroy(): void {
    this.stopDurationTimer();
    
    if (this.device) {
      try {
        this.device.destroy();
      } catch (error) {
        console.error('Error destroying Twilio device:', error);
      }
    }
    
    this.device = null;
    this.token = null;
    this.callListeners = [];
  }
}

// Make supabase public to be used in the class methods
const twilioService = new TwilioService();
(twilioService as any).supabase = supabase;
export default twilioService;

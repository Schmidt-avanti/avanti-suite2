
import { useRef, useState, useEffect } from 'react';

interface UseChatScrollProps {
  hasNewMessages: boolean;
  setHasNewMessages: (value: boolean) => void;
  isLoading?: boolean;
}

export const useChatScroll = ({ 
  hasNewMessages, 
  setHasNewMessages, 
  isLoading = false 
}: UseChatScrollProps) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // Set up intersection observer to detect when bottom of chat is visible
  useEffect(() => {
    if (!chatContainerRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only update the scroll button visibility
        setShowScrollButton(!entry.isIntersecting);
        
        // If we can see the bottom and there are new messages, enable auto-scroll
        if (entry.isIntersecting && hasNewMessages) {
          setAutoScroll(true);
          setHasNewMessages(false);
        }
      },
      {
        root: chatContainerRef.current,
        rootMargin: '0px',
        threshold: 0.1 // Detect when element is 10% visible
      }
    );
    
    if (messagesEndRef.current) {
      observer.observe(messagesEndRef.current);
    }
    
    return () => {
      if (messagesEndRef.current) {
        observer.unobserve(messagesEndRef.current);
      }
    };
  }, [hasNewMessages, setHasNewMessages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setAutoScroll(true);
      setHasNewMessages(false);
    }
  };

  // Auto-scroll when new messages arrive or after loading, but only if autoScroll is true
  useEffect(() => {
    if ((autoScroll && !isLoading && hasNewMessages)) {
      const timer = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, hasNewMessages, autoScroll]);

  // Handle manual scroll to disable auto-scrolling
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Only disable auto-scroll if we're scrolling up (away from the bottom)
    // Use a larger threshold to avoid flickering
    if (distanceFromBottom > 150) {
      setAutoScroll(false);
    }
  };

  return {
    chatContainerRef,
    messagesEndRef,
    showScrollButton,
    setAutoScroll,
    handleScroll,
    scrollToBottom,
    autoScroll
  };
};

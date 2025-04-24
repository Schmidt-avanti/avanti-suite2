
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface LoginTransitionProps {
  userName?: string;
  onComplete: () => void;
}

const LoginTransition: React.FC<LoginTransitionProps> = ({ userName, onComplete }) => {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    if (!hasPlayed) {
      const audio = new Audio('/login-sound.mp3');
      
      const playSound = () => {
        if (soundEnabled) {
          audio.play().catch(() => {
            // Ignore autoplay errors
          });
        }
      };

      // Start the animation sequence
      setTimeout(playSound, 800); // Play sound when logo appears
      setTimeout(onComplete, 5300); // Complete after full animation (extended to 5 seconds)
      setHasPlayed(true);
    }
  }, [hasPlayed, onComplete, soundEnabled]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="absolute top-4 right-4 text-white/50 hover:text-white"
      >
        {soundEnabled ? <Volume2 /> : <VolumeX />}
      </Button>

      <div className="relative flex flex-col items-center">
        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.5
            }}
            className="relative"
          >
            <motion.div
              animate={{
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              className="w-32 h-32 flex items-center justify-center"
            >
              <img
                src="/lovable-uploads/eff651fc-49c9-4b51-b5bc-d14c401b3934.png"
                alt="avanti suite"
                className="w-full h-full object-contain"
              />
            </motion.div>
          </motion.div>

          {userName && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="mt-8 text-xl font-medium text-white text-center"
            >
              Willkommen zurück, {userName}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default LoginTransition;

import React from 'react';
import LoginForm from '@/components/auth/LoginForm';
const Login: React.FC = () => {
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 mt-20">
        <div className="text-center">
          <h1 className="flex justify-center mb-6">
            <img alt="avanti suite" className="h-20 transform hover:scale-105 transition-transform duration-200" src="/lovable-uploads/73e13e0c-4f3b-4dc7-a65b-953f5b5beafb.png" />
          </h1>
          
          
        </div>
        
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </div>;
};
export default Login;
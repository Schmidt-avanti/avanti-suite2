
import React from 'react';
import LoginForm from '@/components/auth/LoginForm';

const Login: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="avanti-logo text-3xl font-extrabold text-avanti-600">
            avanti<span className="text-gray-800">task</span>
          </h1>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Anmelden
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Bitte melden Sie sich mit Ihren Zugangsdaten an
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;

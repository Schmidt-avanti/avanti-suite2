
import React from 'react';
import RegisterForm from '@/components/auth/RegisterForm';

const Register: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="avanti-logo text-3xl font-extrabold text-avanti-600">
            avanti<span className="text-gray-800">task</span>
          </h1>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Create a new account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join avantitask to manage your tasks effectively
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
};

export default Register;

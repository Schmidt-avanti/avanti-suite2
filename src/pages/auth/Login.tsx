import React from 'react';
import LoginForm from '@/components/auth/LoginForm';
const Login: React.FC = () => {
  return <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="flex justify-center mb-2">
            <img alt="avanti suite" className="h-14" src="/lovable-uploads/73e13e0c-4f3b-4dc7-a65b-953f5b5beafb.png" />
          </h1>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Anmelden
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Bitte melde dich mit deinen Zugangsdaten an
          </p>
          <div className="mt-4 p-3 bg-avanti-50 border border-avanti-100 rounded-md text-sm text-avanti-700">
            <strong>Hinweis:</strong> Neues Benutzerprofil benötigt? Ein Administrator muss für dich ein Profil anlegen.
          </div>
        </div>
        <LoginForm />
      </div>
    </div>;
};
export default Login;
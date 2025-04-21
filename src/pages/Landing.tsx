
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="relative z-10 bg-white pb-8 sm:pb-16 md:pb-20 lg:w-full lg:max-w-2xl lg:pb-28 xl:pb-32">
            <main className="mx-auto mt-10 max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block">Task management for</span>
                  <span className="block text-avanti-600">customer support teams</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mx-auto sm:mt-5 sm:max-w-xl sm:text-lg md:mt-5 md:text-xl lg:mx-0">
                  Streamline your customer support workflow with our intuitive task management system. 
                  Assign tasks, track progress, and ensure your customers receive the best service.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="mt-3 sm:mt-0">
                    <Button 
                      className="w-full bg-avanti-600 hover:bg-avanti-700 px-8 py-3 text-base font-medium"
                      asChild
                    >
                      <Link to="/auth/login">Sign in</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="hidden lg:absolute lg:inset-y-0 lg:right-0 lg:block lg:w-1/2">
          <div className="h-56 w-full bg-avanti-100 sm:h-72 md:h-96 lg:h-full lg:w-full">
            <div className="flex items-center justify-center h-full">
              <div className="text-avanti-500 text-9xl opacity-20">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="512" 
                  height="512" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="0.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-avanti-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              A better way to manage customer tasks
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Our platform helps your team stay organized, accountable, and efficient.
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              {[
                {
                  title: 'Role-based Access Control',
                  description: 'Different access levels for admins, agents, and customers ensure data security.',
                },
                {
                  title: 'Customer Assignment',
                  description: 'Assign specific agents to customers for personalized service.',
                },
                {
                  title: 'Task Tracking',
                  description: 'Create, assign, and track tasks through their entire lifecycle.',
                },
                {
                  title: 'Customizable Dashboards',
                  description: 'Each user role gets a dashboard tailored to their specific needs.',
                },
              ].map((feature, index) => (
                <div key={index} className="relative">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-6 w-6 text-avanti-500" />
                    </div>
                    <div>
                      <p className="text-lg leading-6 font-medium text-gray-900">{feature.title}</p>
                      <p className="mt-2 text-base text-gray-500">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-avanti-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to get started?</span>
            <span className="block text-avanti-100">Contact your administrator for access.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Button className="bg-white text-avanti-600 hover:bg-gray-100 px-5 py-3 text-base font-medium" asChild>
                <Link to="/auth/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;

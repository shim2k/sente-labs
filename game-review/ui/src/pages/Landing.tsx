import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [navOpen, setNavOpen] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      // Determine API base URL based on environment
      const apiBaseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://aoe4.senteai.com' 
        : 'http://localhost:4000';
      
      const response = await fetch(`${apiBaseUrl}/api/v1/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          source: 'landing_page'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Thank you for joining our waitlist! We\'ll notify you when we expand beyond AOE4.');
        setEmail('');
      } else {
        // Handle specific error cases
        if (response.status === 409) {
          setErrorMessage('This email is already subscribed to our waitlist.');
        } else {
          setErrorMessage(data.message || 'Unable to process request. Please try again later.');
        }
      }
    } catch (error) {
      console.error('Waitlist signup error:', error);
      setErrorMessage('Unable to connect to the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    // Check if we're navigating to a different page (like pricing, terms)
    if (sectionId === 'pricing' || sectionId === 'terms') {
      navigate(`/public/${sectionId}`);
      setNavOpen(false);
      return;
    }

    // For sections on the same page
    const element = document.getElementById(sectionId);
    if (element) {
      // Different offset for mobile vs desktop
      const yOffset = window.innerWidth < 768 ? -65 : -80; // Extra offset for mobile
      const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    setNavOpen(false);
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>
      {/* Header */}
      <header className="bg-gray-900/95 backdrop-blur-md shadow-lg fixed top-0 left-0 right-0 z-50 border-b border-blue-900/50">
        <div className="max-w-7xl mx-auto py-4 px-6 flex justify-between items-center">
          <h1 
            className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent cursor-pointer"
            onClick={() => scrollToSection('hero')}
          >
            Sente AI
          </h1>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8 items-center">
            <button
              onClick={() => scrollToSection('features')}
              className="text-gray-300 hover:text-blue-400 cursor-pointer text-lg transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-gray-300 hover:text-blue-400 cursor-pointer text-lg transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('aoe4')}
              className="text-gray-300 hover:text-blue-400 cursor-pointer text-lg transition-colors"
            >
              AOE4 Reviews
            </button>
            <button
              onClick={() => navigate('/games')}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white px-6 py-2 rounded-full transition-all duration-300 text-lg font-semibold"
            >
              Launch App
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setNavOpen(!navOpen)}
              className="relative w-8 h-8 text-blue-400 focus:outline-none transition-all duration-300 hover:scale-110"
            >
              {/* Hamburger lines with animation */}
              <span className={`absolute block w-6 h-0.5 bg-current transform transition-all duration-300 ease-in-out ${navOpen ? 'rotate-45 translate-y-0' : '-translate-y-2'}`} style={{ top: '50%', left: '50%', marginLeft: '-12px', marginTop: '-1px' }}></span>
              <span className={`absolute block w-6 h-0.5 bg-current transform transition-all duration-300 ease-in-out ${navOpen ? 'opacity-0' : 'opacity-100'}`} style={{ top: '50%', left: '50%', marginLeft: '-12px', marginTop: '-1px' }}></span>
              <span className={`absolute block w-6 h-0.5 bg-current transform transition-all duration-300 ease-in-out ${navOpen ? '-rotate-45 translate-y-0' : 'translate-y-2'}`} style={{ top: '50%', left: '50%', marginLeft: '-12px', marginTop: '-1px' }}></span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {navOpen && (
          <nav className="md:hidden bg-gray-800/95 backdrop-blur-sm border-t border-blue-800/50">
            <div className="py-4 space-y-4 text-center">
              <button
                onClick={() => scrollToSection('features')}
                className="block w-full text-gray-300 hover:text-blue-400 cursor-pointer text-lg py-2"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="block w-full text-gray-300 hover:text-blue-400 cursor-pointer text-lg py-2"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('aoe4')}
                className="block w-full text-gray-300 hover:text-blue-400 cursor-pointer text-lg py-2"
              >
                AOE4 Reviews
              </button>
              <button
                onClick={() => navigate('/games')}
                className="mx-auto bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-2 rounded-full text-lg font-semibold"
              >
                Launch App
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* Hero Section */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center pt-20"
        style={{
          backgroundImage: 'linear-gradient(to bottom, rgba(17, 24, 39, 0.8), rgba(17, 24, 39, 0.95)), url("/images/aoe4-battle.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/30 to-gray-900"></div>
        <div className="container mx-auto px-6 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="block bg-gradient-to-r from-white via-blue-100 to-gray-200 bg-clip-text text-transparent">
                AI-Powered Game Reviews
              </span>
              <span className="block bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                That Make You Better
              </span>
            </h2>
            <p className="mb-8 text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
              Get personalized match analysis and strategic recommendations to improve your gameplay. Currently featuring Age of Empires IV.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-4">
              <button
                onClick={() => navigate('/games')}
                className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-full shadow-xl hover:shadow-blue-500/25 transition-all duration-300 text-lg transform hover:scale-105"
              >
                Try AOE4 Game Reviews
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="bg-transparent border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-gray-900 font-bold py-4 px-8 rounded-full transition-all duration-300 text-lg"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-800 relative overflow-hidden">
        {/* Animated background effect */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5"></div>
          <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold mb-4 animate-fade-in-up">
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                Level Up Your Game
              </span>
              <span className="block mt-2">with AI Analysis</span>
            </h3>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
              Understand your gameplay patterns, learn from mistakes, and discover winning strategies.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Personalized Strategic Insights',
                description: 'Get tailored recommendations based on your playstyle, highlighting strengths to build on and weaknesses to improve.',
                icon: (
                  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="#10b981" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                gradient: 'from-green-400 to-blue-500',
                iconColor: 'text-green-400',
                delay: '0',
              },
              {
                title: 'Detailed Match Breakdowns',
                description: 'Analyze every aspect of your games including economy, military composition, and key turning points.',
                icon: (
                  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="#60a5fa" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                gradient: 'from-blue-400 to-purple-500',
                iconColor: 'text-blue-400',
                delay: '150',
              },
              {
                title: 'Improve Your Win Rate',
                description: 'Learn from every match with actionable tips on build orders, unit counters, and tactical decisions.',
                icon: (
                  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="#a78bfa" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                gradient: 'from-purple-400 to-pink-500',
                iconColor: 'text-purple-400',
                delay: '300',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className={`group relative bg-gray-900 rounded-2xl p-8 border border-gray-700 hover:border-transparent transition-all duration-500 ease-out hover:shadow-2xl hover:shadow-blue-500/20 transform hover:-translate-y-2 animate-fade-in-up`}
                style={{ animationDelay: `${feature.delay}ms` }}
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/5 group-hover:to-purple-600/5 rounded-2xl transition-all duration-300"></div>
                
                {/* Icon container */}
                <div className="relative mb-6 inline-block">
                  {/* Glow effect behind icon - separate from icon to avoid blur */}
                  <div className={`absolute -inset-4 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-30 blur-2xl transition-opacity duration-300 pointer-events-none`}></div>
                  {/* Icon itself - always visible */}
                  <div className="relative z-10">
                    <div className={`bg-gradient-to-r ${feature.gradient} p-[1px] rounded-xl`}>
                      <div className="bg-gray-900 rounded-xl p-4">
                        {feature.icon}
                      </div>
                    </div>
                  </div>
                </div>
                
                <h4 className="relative font-bold text-2xl mb-4 group-hover:text-blue-300 transition-colors duration-300">
                  {feature.title}
                </h4>
                <p className="relative text-gray-400 text-lg group-hover:text-gray-300 transition-colors duration-300">
                  {feature.description}
                </p>
                
                {/* Simple gradient border on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 p-[1px]">
                  <div className="absolute inset-[1px] bg-gray-900 rounded-2xl"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Add custom animations */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.8s ease-out forwards;
            opacity: 0;
          }
          .animation-delay-200 {
            animation-delay: 200ms;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}} />
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-900 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute h-full w-full bg-gradient-to-br from-blue-900/10 via-transparent to-purple-900/10"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold mb-4 animate-fade-in-up">
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                How It Works
              </span>
            </h3>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
              Our simple process turns your match replays into personalized coaching
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-blue-500/20 via-purple-500/20 to-pink-500/20 hidden md:block"></div>
            
            {[
              {
                step: 1,
                title: 'Connect Your Game Account',
                description: 'Link your Steam account and we\'ll automatically sync your Age of Empires IV matches.',
                icon: (
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="#60a5fa" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                ),
                gradient: 'from-blue-500 to-cyan-500',
                delay: '0',
              },
              {
                step: 2,
                title: 'Select a Match to Review',
                description: 'Choose any of your recent matches and our AI will analyze the replay data in minutes.',
                icon: (
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="#a78bfa" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="#a78bfa" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ),
                gradient: 'from-purple-500 to-pink-500',
                delay: '200',
              },
              {
                step: 3,
                title: 'Get Your Personalized Review',
                description: 'Receive a comprehensive analysis with tips on economy, strategy, and areas for improvement.',
                icon: (
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="#10b981" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                ),
                gradient: 'from-green-500 to-emerald-500',
                delay: '400',
              },
            ].map((item, index) => (
              <div 
                key={index} 
                className={`relative flex items-center mb-20 last:mb-0 animate-fade-in-up ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                style={{ animationDelay: `${item.delay}ms` }}
              >
                {/* Timeline dot */}
                <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full hidden md:block"></div>
                
                {/* Content card */}
                <div className={`group w-full md:w-5/12 ${index % 2 === 0 ? 'md:pr-8 md:text-right' : 'md:pl-8'}`}>
                  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 transform hover:-translate-y-1">
                    <div className={`flex flex-col md:flex-row items-center md:items-center mb-4 ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                      {/* Icon with gradient background */}
                      <div className="relative mb-4 md:mb-0">
                        <div className={`absolute -inset-2 bg-gradient-to-r ${item.gradient} opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-300`}></div>
                        <div className={`relative bg-gradient-to-r ${item.gradient} p-[1px] rounded-xl`}>
                          <div className="bg-gray-800 rounded-xl p-3">
                            {item.icon}
                          </div>
                        </div>
                      </div>
                      <h4 className={`text-2xl font-bold text-center md:text-left ${index % 2 === 0 ? 'md:mr-4 md:text-right' : 'md:ml-4'} text-white group-hover:text-blue-300 transition-colors duration-300`}>
                        Step {item.step}: {item.title}
                      </h4>
                    </div>
                    <p className="text-gray-400 text-lg group-hover:text-gray-300 transition-colors duration-300">
                      {item.description}
                    </p>
                  </div>
                </div>
                
                {/* Spacer for timeline */}
                <div className="hidden md:block w-2/12"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AOE4 Section */}
      <section id="aoe4" className="py-20 bg-gradient-to-br from-blue-900/20 via-gray-900 to-indigo-900/20 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl animate-bounce"></div>
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl animate-ping"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold mb-4 animate-fade-in-up">
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent">
                Now Available: AOE4 Game Reviews
              </span>
            </h3>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
              Experience the future of gaming improvement with AI-powered analysis
            </p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            <div className="group bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-blue-500/30 hover:border-blue-400/50 shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 animate-fade-in-up animation-delay-400">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* Content */}
                <div className="space-y-6">
                  <h4 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent group-hover:from-blue-200 group-hover:to-white transition-all duration-500">
                    AI-Powered Match Analysis
                  </h4>
                  <p className="text-gray-300 text-lg leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                    Get comprehensive reviews of your Age of Empires IV matches with strategic insights, 
                    build order analysis, and personalized improvement recommendations powered by advanced AI.
                  </p>
                  
                  {/* Enhanced feature list */}
                  <div className="space-y-4">
                    {[
                      { text: 'Detailed match breakdown & timeline analysis', delay: '0' },
                      { text: 'Strategic recommendations for improvement', delay: '100' },
                      { text: 'Build order optimization & economy tips', delay: '200' }
                    ].map((item, index) => (
                      <div 
                        key={index}
                        className="flex items-center text-gray-300 group-hover:text-gray-200 transition-colors duration-300 animate-fade-in-up"
                        style={{ animationDelay: `${600 + parseInt(item.delay)}ms` }}
                      >
                        <div className="relative mr-4">
                          <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-blue-500 rounded-full opacity-30 blur-sm"></div>
                          <svg className="relative w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-lg">{item.text}</span>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => navigate('/games')}
                    className="group/btn relative bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 hover:from-blue-400 hover:via-blue-500 hover:to-purple-500 text-white font-bold py-4 px-8 rounded-full shadow-xl hover:shadow-blue-500/30 transition-all duration-300 transform hover:scale-105 animate-fade-in-up animation-delay-800 overflow-hidden"
                  >
                    <span className="relative z-10">Start Analyzing Your Games</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transform -skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-all duration-700"></div>
                  </button>
                </div>
                
                {/* Visual element */}
                <div className="relative">
                  <div className="relative bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-2xl p-8 border border-gray-600/50 group-hover:border-blue-500/30 transition-all duration-500">
                    {/* Mock game interface */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="h-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full w-32 animate-pulse"></div>
                        <div className="h-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full w-20"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-600 rounded w-full"></div>
                        <div className="h-3 bg-gray-600 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-600 rounded w-5/6"></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded border border-blue-500/30"></div>
                        <div className="h-16 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded border border-green-500/30"></div>
                        <div className="h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded border border-purple-500/30"></div>
                      </div>
                    </div>
                    
                    {/* Floating elements */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full opacity-60 animate-ping"></div>
                    <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-purple-500 rounded-full opacity-40 animate-bounce"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signup Section */}
      <section id="signup" className="py-20 bg-gradient-to-br from-gray-800 via-gray-900 to-blue-900/30 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
          
          {/* Floating particles */}
          <div className="absolute top-20 left-20 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
          <div className="absolute top-40 right-32 w-3 h-3 bg-purple-400 rounded-full animate-bounce"></div>
          <div className="absolute bottom-32 left-1/3 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-4 h-4 bg-pink-400 rounded-full animate-ping animation-delay-4000"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-12">
              <h3 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in-up">
                <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Ready to Level Up
                </span>
                <span className="block text-white">Your Game?</span>
              </h3>
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
                Join the waitlist to be notified when we expand to more games beyond AOE4.
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <form className="animate-fade-in-up animation-delay-400" onSubmit={handleFormSubmit}>
                <div className="group relative bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 p-[1px] rounded-2xl md:rounded-full backdrop-blur-sm">
                  <div className="bg-gray-900/80 rounded-2xl md:rounded-full p-3 md:p-2">
                    <div className="flex flex-col md:flex-row gap-3 md:gap-2">
                      <div className="relative flex-1">
                        <input
                          type="email"
                          placeholder="Enter your email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-6 py-4 rounded-xl md:rounded-full bg-gray-800/50 border border-gray-600/50 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-gray-800/70 transition-all duration-300 backdrop-blur-sm text-lg"
                          required
                        />
                        <div className="absolute inset-0 rounded-xl md:rounded-full bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500 pointer-events-none"></div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className={`group/btn relative bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-400 hover:via-purple-400 hover:to-pink-400 text-white font-bold py-4 px-8 rounded-xl md:rounded-full shadow-xl transition-all duration-300 overflow-hidden text-lg min-h-[56px] ${
                          loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-blue-500/30 transform hover:scale-105'
                        }`}
                      >
                        <span className="relative z-10 whitespace-nowrap">
                          {loading ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Submitting...
                            </div>
                          ) : (
                            'Get Early Access'
                          )}
                        </span>
                        {!loading && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transform -skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-all duration-700"></div>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
              
              {/* Messages with animations */}
              {successMessage && (
                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl backdrop-blur-sm animate-fade-in-up">
                  <p className="text-green-400 text-lg flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {successMessage}
                  </p>
                </div>
              )}
              
              {errorMessage && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl backdrop-blur-sm animate-fade-in-up">
                  <p className="text-red-400 text-lg flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errorMessage}
                  </p>
                </div>
              )}
              
              {/* Trust indicators */}
              <div className="mt-8 flex items-center justify-center gap-8 text-gray-400 text-sm animate-fade-in-up animation-delay-600">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span>Secure & Private</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <span>No Spam</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  <span>Early Access</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-t from-gray-900 via-gray-900 to-gray-800 border-t border-blue-900/50 py-16 relative overflow-hidden">
        {/* Subtle background animation */}
        <div className="absolute inset-0">
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-purple-500/5 rounded-full blur-2xl animate-pulse animation-delay-2000"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12">
            {/* Brand section with animation */}
            <div className="mb-8 md:mb-0 text-center md:text-left animate-fade-in-up">
              <h2 className="text-3xl font-bold mb-3">
                <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Sente AI
                </span>
              </h2>
              <p className="text-gray-400 text-lg max-w-md">
                AI-powered game reviews that make you better. Transform your gameplay with intelligent analysis.
              </p>
              
              {/* Social proof indicators */}
              <div className="flex items-center gap-6 mt-4 justify-center md:justify-start">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>AOE4 Ready</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse animation-delay-1000"></div>
                  <span>AI Powered</span>
                </div>
              </div>
            </div>
            
            {/* Navigation links with enhanced styling */}
            <div className="animate-fade-in-up animation-delay-200">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <button
                  onClick={() => navigate('/games')}
                  className="group relative text-gray-400 hover:text-blue-400 transition-all duration-300 text-lg font-medium"
                >
                  <span className="relative z-10">AOE4 Game Reviews</span>
                  <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 rounded-lg blur-xl transition-opacity duration-300"></div>
                </button>
                
                <div className="w-1 h-1 bg-gray-600 rounded-full hidden md:block"></div>
                
                <button
                  onClick={() => navigate('/public/terms')}
                  className="group relative text-gray-400 hover:text-blue-400 transition-all duration-300 text-lg font-medium"
                >
                  <span className="relative z-10">Terms of Service</span>
                  <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 rounded-lg blur-xl transition-opacity duration-300"></div>
                </button>
                
                <div className="w-1 h-1 bg-gray-600 rounded-full hidden md:block"></div>
                
                <button
                  onClick={() => navigate('/public/pricing')}
                  className="group relative text-gray-400 hover:text-blue-400 transition-all duration-300 text-lg font-medium"
                >
                  <span className="relative z-10">Pricing</span>
                  <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 rounded-lg blur-xl transition-opacity duration-300"></div>
                </button>
              </div>
              
              {/* CTA Button */}
              <div className="mt-6 text-center md:text-right">
                <button
                  onClick={() => scrollToSection('signup')}
                  className="group relative bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 hover:border-blue-400/50 text-blue-300 hover:text-white px-6 py-3 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 backdrop-blur-sm"
                >
                  <span className="relative z-10">Get Early Access</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/20 group-hover:to-purple-500/20 rounded-full transition-all duration-300"></div>
                </button>
              </div>
            </div>
          </div>
          
          {/* Divider with gradient */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
            </div>
            <div className="relative flex justify-center">
              <div className="bg-gray-900 px-4">
                <div className="w-16 h-[1px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
              </div>
            </div>
          </div>
          
          {/* Copyright and additional info */}
          <div className="text-center animate-fade-in-up animation-delay-400">
            <p className="text-gray-500 text-lg mb-4">
              &copy; 2024 Sente AI. All rights reserved.
            </p>
            <p className="text-gray-600 text-sm">
              Built with ❤️ for the gaming community. 
              <span className="text-blue-400 ml-1">Level up your gameplay with AI.</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logger from '../../utils/logger';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = () => {
      try {
        // Get token from URL parameters
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (!token) {
          throw new Error('No token received');
        }

        // Store token
        localStorage.setItem('token', token);
        
        Logger.info('AuthCallback', 'Successfully stored token');

        // Redirect to home
        navigate('/home');
      } catch (error) {
        Logger.error('AuthCallback', 'Failed to process authentication callback', error);
        navigate('/signin', { state: { error: 'Authentication failed. Please try again.' } });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Completing Sign In...</h2>
        <p className="text-sm opacity-70">Please wait while we process your authentication.</p>
      </div>
    </div>
  );
};

export default AuthCallback; 
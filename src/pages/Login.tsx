import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, Eye, EyeOff, Lock, User } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(username, password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Invalid credentials. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md"
      >
        {/* Centered Logo and Company Name */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <div className="flex flex-col items-center gap-4 mb-8">
            <img src="/logo.png" alt="HikeEducation Logo" className="w-20 h-20 rounded-2xl" />
            <div className="text-center">
              <h1 className="text-3xl font-bold gradient-text">HikeEducation</h1>
              <p className="text-muted-foreground">Dashboard Platform</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card-elevated p-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground">Welcome Back</h2>
            <p className="text-muted-foreground mt-2">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
              >
                <p className="text-sm text-destructive">{error}</p>
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="input-field pl-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pl-12 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <TrendingUp className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-center text-muted-foreground mb-4">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-foreground">Admin</p>
                <p className="text-muted-foreground">HikeVP / Hike@Akash</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-foreground">Manager</p>
                <p className="text-muted-foreground">HikeManagerMUM / Hike@MUM</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

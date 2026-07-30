import { useState } from 'react';
import { Lock, User, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // <-- Import Axios

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(''); // <-- State for error messages
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(''); // Clear previous errors

    try {
      // Send credentials to Node.js backend
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/login`, {
        username,
        password
      });

      // If successful, save the JWT token to local storage
      localStorage.setItem('pegasus_token', response.data.token);
      
      // Teleport the user to the dashboard
      navigate('/'); 

    } catch (error) {
      // If backend returns a 401 error, show it to the user
      if (error.response && error.response.status === 401) {
        setErrorMsg("Identifiant ou mot de passe incorrect.");
      } else {
        setErrorMsg("Erreur de connexion au serveur.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Pegasus</h1>
          <p className="text-sm text-gray-500 mt-2">Portail d'Administration SEHI</p>
        </div>

        {/* Display Error Message if it exists */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm text-center rounded-xl border border-red-100">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              placeholder="Identifiant"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              className="block w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 px-4 rounded-xl hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 font-medium"
          >
            Se connecter
            <ChevronRight className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
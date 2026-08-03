import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { LayoutDashboard, Database, Bot, Settings, LogOut, Menu, Sun, Moon, HardDrive, RefreshCw, AlertCircle, FileUp, Eraser, Send, ArrowUpDown, Trash2, Wand2, CheckCircle2, Users, Briefcase, Package, Edit2, Save, X } from 'lucide-react';

export default function DataHub() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('pegasus_theme') === 'dark');
  const [systemStatus, setSystemStatus] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [activeTab, setActiveTab] = useState('import'); 

  // Excel States
  const [importedData, setImportedData] = useState([]);
  const [fileHeaders, setFileHeaders] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // Database States & Inline Editing
  const [dbData, setDbData] = useState({ commerciaux: [], clients: [], articles: [] });
  const [editingRow, setEditingRow] = useState(null); // Stocke l'ID de la ligne en cours d'édition
  const [editFormData, setEditFormData] = useState({}); // Stocke les données temporaires tapées par l'utilisateur

  // 1. Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pegasus_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pegasus_theme', 'light');
    }
  }, [isDarkMode]);

  // 2. Fetch System Status & Database Tables
  useEffect(() => {
    const fetchData = async () => {
      try {
        const statusRes = await axios.get(`${import.meta.env.VITE_API_URL}/system-status`);
        setSystemStatus(statusRes.data);

        const [commerciauxRes, clientsRes, articlesRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/commerciaux`),
          axios.get(`${import.meta.env.VITE_API_URL}/clients`),
          axios.get(`${import.meta.env.VITE_API_URL}/articles`)
        ]);

        setDbData({
          commerciaux: commerciauxRes.data,
          clients: clientsRes.data,
          articles: articlesRes.data
        });
      } catch (error) {
        console.error("Erreur de chargement des données:", error);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('pegasus_token');
    navigate('/login');
  };

  // ==========================================
  // INLINE EDITING LOGIC (CRUD)
  // ==========================================

  const handleEditClick = (row, pkName) => {
    setEditingRow(row[pkName]);
    setEditFormData({ ...row }); // Copie la ligne entière dans le formulaire temporaire
  };

  const handleEditChange = (e, key) => {
    setEditFormData({
      ...editFormData,
      [key]: e.target.value
    });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditFormData({});
  };

  const handleSaveClick = async (tableName, pkName) => {
    try {
      const id = editFormData[pkName];
      
      // Appel API PUT vers le backend
      await axios.put(`${import.meta.env.VITE_API_URL}/${tableName}/${id}`, editFormData);

      // Mise à jour de l'état local pour refléter le changement sans recharger la page
      setDbData(prev => ({
        ...prev,
        [tableName]: prev[tableName].map(row => 
          row[pkName] === id ? editFormData : row
        )
      }));

      setToast({ show: true, message: `Mise à jour réussie.`, type: 'success' });
      setEditingRow(null);
      setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);

    } catch (error) {
      console.error("Erreur de mise à jour:", error);
      setToast({ show: true, message: "Erreur lors de la mise à jour.", type: 'error' });
      setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
    }
  };

  // ==========================================
  // EXCEL IMPORT LOGIC
  // ==========================================

  const handleUploadClick = () => fileInputRef.current.click();

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, { type: 'binary' });
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      
      if (jsonData.length > 0) {
        setFileHeaders(Object.keys(jsonData[0]));
        setImportedData(jsonData);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; 
  };

  const handleCleanData = () => {
    const cleanedData = importedData.map(row => {
      const cleanedRow = {};
      fileHeaders.forEach(key => {
        let value = row[key];
        if (typeof value === 'string') {
          value = value.trim().toUpperCase();
          if (!isNaN(value) && value !== '') value = Math.round(parseFloat(value) * 100) / 100;
        } else if (typeof value === 'number') {
          value = Math.round(value * 100) / 100;
        }
        cleanedRow[key] = value;
      });
      return cleanedRow;
    }).filter(row => fileHeaders.some(header => row[header] !== undefined && row[header] !== null && row[header] !== ""));
    setImportedData(cleanedData);
  };

  const handleSort = (key, isDbView = false, dbKey = '') => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    
    const sortLogic = (a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    };

    if (isDbView) {
      setDbData(prev => ({ ...prev, [dbKey]: [...prev[dbKey]].sort(sortLogic) }));
    } else {
      setImportedData([...importedData].sort(sortLogic));
    }
    setSortConfig({ key, direction });
  };

  const handleDiscard = () => {
    setImportedData([]);
    setFileHeaders([]);
  };

  const handleSyncToDatabase = async () => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/sync-clients`, { data: importedData });
      const { inserted, total_processed } = response.data;

      if (inserted === 0) {
        setToast({ show: true, message: `Données déjà existantes. Aucun nouveau champ ajouté parmi les ${total_processed} lignes.`, type: 'info' });
      } else {
        setToast({ show: true, message: `Succès ! ${inserted} nouveaux clients ajoutés à la base de données.`, type: 'success' });
      }
      setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 5000);
    } catch (error) {
      setToast({ show: true, message: "Erreur critique lors de la synchronisation.", type: 'error' });
      setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 5000);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === "N/A") return "Inconnue";
    return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // ==========================================
  // DYNAMIC RENDERER FOR DB TABLES
  // ==========================================
  const renderDbTable = (dataArray, columns, tableName, pkName) => (
    <div className="overflow-auto max-h-[500px] custom-scrollbar rounded-xl border border-gray-100 dark:border-gray-800 animate-fade-in-up">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10 shadow-sm">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} onClick={() => handleSort(col.key, true, activeTab)} className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center gap-2">
                  {col.label}
                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                </div>
              </th>
            ))}
            <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {dataArray.map((row, rowIndex) => {
            const isEditing = editingRow === row[pkName];

            return (
              <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-50 dark:border-gray-800/50">
                
                {/* RENDERING COLUMNS */}
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className={`p-4 text-sm ${colIndex === 0 ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                    {isEditing && col.editable ? (
                      <input 
                        type="text" 
                        value={editFormData[col.key] || ''} 
                        onChange={(e) => handleEditChange(e, col.key)}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      col.format ? col.format(row[col.key]) : row[col.key]
                    )}
                  </td>
                ))}

                {/* RENDERING ACTION BUTTONS */}
                <td className="p-4 text-right">
                  {isEditing ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleSaveClick(tableName, pkName)} className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 transition-colors" title="Sauvegarder">
                        <Save className="h-4 w-4" />
                      </button>
                      <button onClick={handleCancelEdit} className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 transition-colors" title="Annuler">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleEditClick(row, pkName)} className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors" title="Éditer">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                </td>

              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      
      {/* SIDEBAR */}
      <aside className={`flex-shrink-0 transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="w-64 h-full flex flex-col justify-between">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-8">Pegasus</h2>
            <nav className="space-y-2">
              <Link to="/" className="flex items-center gap-3 px-4 py-3 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-xl font-medium transition-colors">
                <LayoutDashboard className="h-5 w-5" /> Vue d'ensemble
              </Link>
              <Link to="/datahub" className="flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-medium transition-colors">
                <Database className="h-5 w-5" /> Hub de Données
              </Link>
              <Link to="/ia" className="flex items-center gap-3 px-4 py-3 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-xl font-medium transition-colors">
                <Bot className="h-5 w-5" /> Assistant IA
              </Link>
              <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-xl font-medium transition-colors">
                <Settings className="h-5 w-5" /> Paramètres
              </Link>
            </nav>
          </div>
          <div className="p-6 border-t border-gray-100 dark:border-gray-800">
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-medium transition-colors">
              <LogOut className="h-5 w-5" /> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        
        {/* TOP NAVBAR */}
        <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 py-4 flex justify-between items-center z-10 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hub de Données</h1>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl"><HardDrive className="h-5 w-5" /></div>
                  <h3 className="font-bold text-gray-900 dark:text-white">MySQL Status</h3>
                </div>
                <div className={`h-3 w-3 rounded-full ${systemStatus ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{systemStatus ? `${systemStatus.total_invoices} factures indexées.` : 'Connexion en cours...'}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl"><RefreshCw className="h-5 w-5" /></div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Dernière Synchro</h3>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{systemStatus ? formatDate(systemStatus.last_sync) : '...'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Date de la facture la plus récente.</p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
               <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl"><AlertCircle className="h-5 w-5" /></div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Anomalies</h3>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{systemStatus ? `${systemStatus.anomalies} Rejets` : '...'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Lors du dernier import système.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
            
            {/* TABS */}
            <div className="flex flex-wrap gap-2 bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded-xl mb-6 w-fit border border-gray-100 dark:border-gray-800">
              <button onClick={() => { setActiveTab('import'); handleCancelEdit(); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'import' ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <FileUp className="h-4 w-4" /> Importation Excel
              </button>
              <button onClick={() => { setActiveTab('commerciaux'); handleCancelEdit(); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'commerciaux' ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <Briefcase className="h-4 w-4" /> Commerciaux
              </button>
              <button onClick={() => { setActiveTab('clients'); handleCancelEdit(); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'clients' ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <Users className="h-4 w-4" /> Clients
              </button>
              <button onClick={() => { setActiveTab('articles'); handleCancelEdit(); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'articles' ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <Package className="h-4 w-4" /> Catalogue Articles
              </button>
            </div>

            {/* CONTENT ROUTING */}
            {activeTab === 'commerciaux' && renderDbTable(
              dbData.commerciaux, 
              [
                { key: 'id_commercial', label: 'ID', editable: false },
                { key: 'nom_commercial', label: 'Nom du Commercial', editable: true },
                { key: 'division', label: 'Division', editable: true },
                { key: 'objectif_annuel', label: 'Objectif Annuel', editable: true, format: (val) => `${Number(val).toLocaleString('fr-FR')} MAD` }
              ],
              'commerciaux',
              'id_commercial'
            )}

            {activeTab === 'clients' && renderDbTable(
              dbData.clients, 
              [
                { key: 'code_client', label: 'Code Client', editable: false },
                { key: 'nom_client', label: 'Raison Sociale', editable: true }
              ],
              'clients',
              'code_client'
            )}

            {activeTab === 'articles' && renderDbTable(
              dbData.articles, 
              [
                { key: 'code_article', label: 'Code Article', editable: false },
                { key: 'designation', label: 'Désignation', editable: true },
                { 
                  key: 'prix_unitaire_ref', 
                  label: 'Prix Unitaire', 
                  editable: true, 
                  // Formats the number with exactly 2 decimal places and appends MAD
                  format: (val) => `${Number(val).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD` 
                }
              ],
              'articles',
              'code_article'
            )}

            {activeTab === 'import' && (
              importedData.length === 0 ? (
                <div className="bg-gray-50 dark:bg-gray-800/20 py-16 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-center animate-fade-in-up">
                  <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <FileUp className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Importer des données</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">Déposez vos fichiers Excel (.xlsx, .csv) contenant de nouveaux clients ou objectifs.</p>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
                  <button onClick={handleUploadClick} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-sm">
                    Parcourir les fichiers
                  </button>
                </div>
              ) : (
                <div className="animate-fade-in-up">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Aperçu avant synchronisation</h3>
                      <p className="text-sm text-gray-500">{importedData.length} lignes détectées</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleDiscard} className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg text-sm font-medium transition-colors">
                        <Trash2 className="h-4 w-4" /> Annuler
                      </button>
                      <button onClick={handleCleanData} className="flex items-center gap-2 px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 rounded-lg text-sm font-medium transition-colors">
                        <Wand2 className="h-4 w-4" /> Nettoyer
                      </button>
                      <button onClick={handleSyncToDatabase} className="flex items-center gap-2 px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors shadow-sm">
                        <Send className="h-4 w-4" /> Synchroniser DB
                      </button>
                    </div>
                  </div>
                  <div className="overflow-auto max-h-[500px] custom-scrollbar rounded-xl border border-gray-100 dark:border-gray-800">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10 shadow-sm">
                        <tr>
                          <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-12 text-center border-b border-gray-200 dark:border-gray-700">#</th>
                          {fileHeaders.map((header, idx) => (
                            <th key={idx} onClick={() => handleSort(header)} className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                              <div className="flex items-center gap-2">{header} <ArrowUpDown className="h-3 w-3 opacity-50" /></div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importedData.map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-50 dark:border-gray-800/50">
                            <td className="p-4 text-sm font-bold text-gray-400 text-center">{rowIndex + 1}</td>
                            {fileHeaders.map((header, colIndex) => (
                              <td key={colIndex} className="p-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                                {row[header] !== undefined && row[header] !== null && row[header] !== "" ? row[header] : <span className="text-red-400 text-xs italic">Vide</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}
          </div>
          
        </main>
      </div>

      {/* TOAST */}
      {toast.show && (
        <div className={`fixed bottom-8 right-8 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border text-sm font-bold z-50 transition-all animate-fade-in-up ${
          toast.type === 'success' ? 'bg-emerald-600 border-emerald-700 text-white' : toast.type === 'error' ? 'bg-red-600 border-red-700 text-white' : 'bg-blue-600 border-blue-700 text-white'
        }`}>
          {toast.type === 'success' && <CheckCircle2 className="h-5 w-5" />}
          {toast.type === 'error' && <AlertCircle className="h-5 w-5" />}
          {toast.type === 'info' && <RefreshCw className="h-5 w-5" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
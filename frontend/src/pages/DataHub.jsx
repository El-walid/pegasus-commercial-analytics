import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { 
  LayoutDashboard, Database, Bot, Settings, LogOut, Menu, Sun, Moon, 
  HardDrive, RefreshCw, AlertCircle, FileUp, Eraser, Send, ArrowUpDown, 
  Trash2, Wand2, CheckCircle2, Users, Briefcase, Package, Edit2, Save, X, Sparkles 
} from 'lucide-react';

export default function DataHub() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // UI States (Détecte si l'on est sur PC pour ouvrir par défaut)
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [systemStatus, setSystemStatus] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [activeTab, setActiveTab] = useState('import'); 

  // Excel States
  const [importedData, setImportedData] = useState([]);
  const [fileHeaders, setFileHeaders] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // Database States & Inline Editing
  const [dbData, setDbData] = useState({ commerciaux: [], clients: [], articles: [] });
  const [editingRow, setEditingRow] = useState(null); 
  const [editFormData, setEditFormData] = useState({}); 

  // Ajustement de la Sidebar au redimensionnement
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch System Status & Database Tables
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
    setEditFormData({ ...row }); 
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
      await axios.put(`${import.meta.env.VITE_API_URL}/${tableName}/${id}`, editFormData);

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
    <div className="overflow-auto max-h-[500px] custom-scrollbar rounded-2xl border border-white/10 animate-fade-in-up">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead className="sticky top-0 bg-[#0a0f1c] z-10 shadow-sm">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} onClick={() => handleSort(col.key, true, activeTab)} className="p-4 text-xs font-semibold text-gray-400 uppercase border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2">
                  {col.label}
                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                </div>
              </th>
            ))}
            <th className="p-4 text-xs font-semibold text-gray-400 uppercase border-b border-white/10 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {dataArray.map((row, rowIndex) => {
            const isEditing = editingRow === row[pkName];

            return (
              <tr key={rowIndex} className="hover:bg-white/[0.02] transition-colors border-b border-white/5">
                
                {/* RENDERING COLUMNS */}
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className={`p-4 text-sm ${colIndex === 0 ? 'text-white font-bold' : 'text-gray-300'}`}>
                    {isEditing && col.editable ? (
                      <input 
                        type="text" 
                        value={editFormData[col.key] || ''} 
                        onChange={(e) => handleEditChange(e, col.key)}
                        className="w-full bg-[#050914] border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-500/50"
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
                      <button onClick={() => handleSaveClick(tableName, pkName)} className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors border border-emerald-500/20" title="Sauvegarder">
                        <Save className="h-4 w-4" />
                      </button>
                      <button onClick={handleCancelEdit} className="p-1.5 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 transition-colors border border-white/10" title="Annuler">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleEditClick(row, pkName)} className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors border border-blue-500/20" title="Éditer">
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
    <div className="flex h-screen w-full overflow-hidden bg-[#050914] text-gray-200 font-sans relative">
      
      {/* BACKGROUND GRID */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* MOBILE SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* FIXED SIDEBAR */}
      <aside className={`fixed md:relative z-50 h-full flex-shrink-0 transition-all duration-300 ease-in-out border-r border-white/10 bg-[#0a0f1c]/90 backdrop-blur-3xl overflow-hidden
        ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-0 md:translate-x-0'}`}>
        <div className="w-64 h-full flex flex-col justify-between">
          <div className="p-6">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-red-500" /> Pegasus
              </h2>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="space-y-2">
              <Link to="/" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl font-medium transition-colors">
                <LayoutDashboard className="h-5 w-5" /> Vue d'ensemble
              </Link>
              <Link to="/datahub" className="flex items-center gap-3 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-medium shadow-[0_0_15px_rgba(239,68,68,0.1)] transition-colors">
                <Database className="h-5 w-5" /> Hub de Données
              </Link>
              <Link to="/ia" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl font-medium transition-colors">
                <Bot className="h-5 w-5" /> Assistant IA
              </Link>
              <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl font-medium transition-colors">
                <Settings className="h-5 w-5" /> Paramètres
              </Link>
            </nav>
          </div>
          <div className="p-6 border-t border-white/10">
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-colors">
              <LogOut className="h-5 w-5" /> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative z-10">
        
        {/* TOP NAVBAR */}
        <header className="flex-shrink-0 bg-[#0f1524]/60 backdrop-blur-2xl border-b border-white/10 px-6 md:px-8 py-4 flex justify-between items-center z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Hub de Données</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-gray-400 font-medium hidden sm:inline">MySQL Connecté</span>
          </div>
        </header>

        {/* SCROLLABLE VIEW */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          
          {/* STATUS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            <div className="bg-[#0f1524]/70 backdrop-blur-3xl p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl"><HardDrive className="h-5 w-5" /></div>
                  <h3 className="font-bold text-white tracking-tight">MySQL Status</h3>
                </div>
                <div className={`h-3 w-3 rounded-full ${systemStatus ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></div>
              </div>
              <p className="text-sm text-gray-400">{systemStatus ? `${systemStatus.total_invoices} factures indexées.` : 'Connexion en cours...'}</p>
            </div>

            <div className="bg-[#0f1524]/70 backdrop-blur-3xl p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl"><RefreshCw className="h-5 w-5" /></div>
                  <h3 className="font-bold text-white tracking-tight">Dernière Synchro</h3>
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-1 tracking-tight">{systemStatus ? formatDate(systemStatus.last_sync) : '...'}</p>
              <p className="text-sm text-gray-400">Date de la facture la plus récente.</p>
            </div>

            <div className="bg-[#0f1524]/70 backdrop-blur-3xl p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-white/10">
               <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl"><AlertCircle className="h-5 w-5" /></div>
                  <h3 className="font-bold text-white tracking-tight">Anomalies</h3>
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-1 tracking-tight">{systemStatus ? `${systemStatus.anomalies} Rejets` : '...'}</p>
              <p className="text-sm text-gray-400">Lors du dernier import système.</p>
            </div>
          </div>

          {/* MAIN CONTAINER */}
          <div className="bg-[#0f1524]/70 backdrop-blur-3xl p-6 md:p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 transition-colors">
            
            {/* TABS */}
            <div className="flex flex-wrap gap-2 bg-black/30 p-1.5 rounded-2xl mb-8 w-fit border border-white/10">
              <button onClick={() => { setActiveTab('import'); handleCancelEdit(); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === 'import' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <FileUp className="h-4 w-4" /> Importation Excel
              </button>
              <button onClick={() => { setActiveTab('commerciaux'); handleCancelEdit(); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === 'commerciaux' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <Briefcase className="h-4 w-4" /> Commerciaux
              </button>
              <button onClick={() => { setActiveTab('clients'); handleCancelEdit(); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === 'clients' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <Users className="h-4 w-4" /> Clients
              </button>
              <button onClick={() => { setActiveTab('articles'); handleCancelEdit(); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === 'articles' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
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
                  format: (val) => `${Number(val).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD` 
                }
              ],
              'articles',
              'code_article'
            )}

            {activeTab === 'import' && (
              importedData.length === 0 ? (
                <div className="bg-black/20 py-16 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center animate-fade-in-up">
                  <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <FileUp className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Importer des données</h3>
                  <p className="text-gray-400 mb-8 max-w-md text-sm">Déposez vos fichiers Excel (.xlsx, .csv) contenant de nouveaux clients ou objectifs.</p>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
                  <button onClick={handleUploadClick} className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                    Parcourir les fichiers
                  </button>
                </div>
              ) : (
                <div className="animate-fade-in-up">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">Aperçu avant synchronisation</h3>
                      <p className="text-sm text-gray-400">{importedData.length} lignes détectées</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={handleDiscard} className="flex items-center gap-2 px-4 py-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm font-medium transition-colors">
                        <Trash2 className="h-4 w-4" /> Annuler
                      </button>
                      <button onClick={handleCleanData} className="flex items-center gap-2 px-4 py-2 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-sm font-medium transition-colors">
                        <Wand2 className="h-4 w-4" /> Nettoyer
                      </button>
                      <button onClick={handleSyncToDatabase} className="flex items-center gap-2 px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-medium transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        <Send className="h-4 w-4" /> Synchroniser DB
                      </button>
                    </div>
                  </div>
                  <div className="overflow-auto max-h-[500px] custom-scrollbar rounded-2xl border border-white/10">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead className="sticky top-0 bg-[#0a0f1c] z-10 shadow-sm">
                        <tr>
                          <th className="p-4 text-xs font-semibold text-gray-400 uppercase w-12 text-center border-b border-white/10">#</th>
                          {fileHeaders.map((header, idx) => (
                            <th key={idx} onClick={() => handleSort(header)} className="p-4 text-xs font-semibold text-gray-400 uppercase border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors">
                              <div className="flex items-center gap-2">{header} <ArrowUpDown className="h-3 w-3 opacity-50" /></div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importedData.map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-white/[0.02] transition-colors border-b border-white/5">
                            <td className="p-4 text-sm font-bold text-gray-500 text-center">{rowIndex + 1}</td>
                            {fileHeaders.map((header, colIndex) => (
                              <td key={colIndex} className="p-4 text-sm font-medium text-gray-300">
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
          toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : toast.type === 'error' ? 'bg-red-600 border-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-blue-600 border-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
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
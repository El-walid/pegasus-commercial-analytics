import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { 
  Menu, HardDrive, RefreshCw, AlertCircle, FileUp, Send, ArrowUpDown, 
  Trash2, Wand2, Edit2, Save, X, PanelLeftClose, PanelLeftOpen 
} from 'lucide-react';

export default function DataHub() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // UI States
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

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 768);
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

        setDbData({ commerciaux: commerciauxRes.data, clients: clientsRes.data, articles: articlesRes.data });
      } catch (error) {
        console.error("Erreur de chargement des données:", error);
      }
    };
    fetchData();
  }, []);

  // ==========================================
  // INLINE EDITING LOGIC (CRUD)
  // ==========================================
  const handleEditClick = (row, pkName) => {
    setEditingRow(row[pkName]);
    setEditFormData({ ...row }); 
  };

  const handleEditChange = (e, key) => setEditFormData({ ...editFormData, [key]: e.target.value });
  const handleCancelEdit = () => { setEditingRow(null); setEditFormData({}); };

  const handleSaveClick = async (tableName, pkName) => {
    try {
      const id = editFormData[pkName];
      await axios.put(`${import.meta.env.VITE_API_URL}/${tableName}/${id}`, editFormData);

      setDbData(prev => ({
        ...prev,
        [tableName]: prev[tableName].map(row => row[pkName] === id ? editFormData : row)
      }));

      showToast(`Entrée ${id} mise à jour avec succès.`, 'success');
      setEditingRow(null);
    } catch (error) {
      console.error("Erreur de mise à jour:", error);
      showToast("Échec de la transaction de mise à jour.", 'error');
    }
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 4000);
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

  const handleDiscard = () => { setImportedData([]); setFileHeaders([]); };

  const handleSyncToDatabase = async () => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/sync-clients`, { data: importedData });
      const { inserted, total_processed } = response.data;

      if (inserted === 0) showToast(`Données redondantes. 0 ajouts sur ${total_processed} lignes traitées.`, 'info');
      else showToast(`Synchronisation réussie : ${inserted} nouvelles entités injectées.`, 'success');
    } catch (error) {
      showToast("Erreur critique : Échec de l'injection des données.", 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === "N/A") return "N/A";
    return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // ==========================================
  // STRICT ARCHITECTURAL TABLE RENDERER
  // ==========================================
  const renderDbTable = (dataArray, columns, tableName, pkName) => (
    <div className="overflow-auto max-h-[600px] custom-scrollbar border border-white/10 bg-[#050505]">
      <table className="w-full text-left border-collapse min-w-[700px] md:min-w-[800px]">
        <thead className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/10">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} onClick={() => handleSort(col.key, true, activeTab)} className="p-3 md:p-4 text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-gray-500 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-2">
                  {col.label} <ArrowUpDown className="h-3 w-3 opacity-30" />
                </div>
              </th>
            ))}
            <th className="p-3 md:p-4 text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-gray-500 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {dataArray.map((row, rowIndex) => {
            const isEditing = editingRow === row[pkName];
            return (
              <tr key={rowIndex} className="hover:bg-white/[0.02] transition-colors group">
                {columns.map((col, colIndex) => {
                  const isIdOrNumber = col.key.includes('id') || col.key.includes('code') || col.key.includes('prix') || col.key.includes('objectif');
                  return (
                    <td key={colIndex} className={`p-3 md:p-4 text-xs md:text-sm ${isIdOrNumber ? 'font-mono text-gray-400' : 'text-gray-200'}`}>
                      {isEditing && col.editable ? (
                        <input 
                          type="text" 
                          value={editFormData[col.key] || ''} 
                          onChange={(e) => handleEditChange(e, col.key)}
                          className="w-full bg-transparent border-b border-white/30 px-0 py-1 text-xs md:text-sm text-white focus:outline-none focus:border-red-600 font-mono transition-colors"
                        />
                      ) : (
                        col.format ? col.format(row[col.key]) : row[col.key]
                      )}
                    </td>
                  );
                })}
                <td className="p-3 md:p-4 text-right">
                  {isEditing ? (
                    <div className="flex justify-end gap-2 md:gap-3">
                      <button onClick={handleCancelEdit} className="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-500 hover:text-gray-300">Annuler</button>
                      <button onClick={() => handleSaveClick(tableName, pkName)} className="text-[9px] md:text-[10px] uppercase tracking-widest text-emerald-500 hover:text-emerald-400 font-bold">Sauvegarder</button>
                    </div>
                  ) : (
                    <button onClick={() => handleEditClick(row, pkName)} className="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-500 hover:text-blue-400 flex items-center gap-2 ml-auto md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Edit2 className="h-3 w-3" /> Éditer
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
    <div className="flex h-screen w-full overflow-hidden bg-black text-gray-200 font-sans relative selection:bg-white/20 selection:text-white">
      
      {/* GLOBAL SIDEBAR */}
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative z-10">
        
        {/* MOBILE HEADER */}
        <header className="md:hidden flex-shrink-0 bg-black/90 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center z-20 sticky top-0">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-white transition-colors">
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-serif font-bold text-white">Hub de Données</h1>
        </header>

        {/* DESKTOP HEADER & TELEMETRY RIBBON */}
        <div className="flex-shrink-0 border-b border-white/10 bg-black">
           <div className="p-8 hidden md:flex justify-between items-start">
             <div>
                <h1 className="text-3xl text-white font-serif tracking-tight">Hub de Données</h1>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-2">Centre de Contrôle & Synchronisation</p>
             </div>
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5">
                {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
             </button>
          </div>

          {/* TELEMETRY LEDGER */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10 border-t border-white/10 bg-[#050505]">
            <div className="p-4 md:p-6 flex justify-between items-center group">
              <div>
                <span className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-[0.2em] block mb-1">Indexation MySQL</span>
                <span className="text-xl md:text-2xl font-mono text-white">{systemStatus ? systemStatus.total_invoices : '...'}</span>
              </div>
              <div className={`h-2 w-2 rounded-full ${systemStatus ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'} animate-pulse`} />
            </div>
            
            <div className="p-4 md:p-6 flex justify-between items-center">
              <div>
                <span className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-[0.2em] block mb-1">Dernier Import</span>
                <span className="text-xl md:text-2xl font-mono text-white">{systemStatus ? formatDate(systemStatus.last_sync) : '...'}</span>
              </div>
              <RefreshCw className="h-5 w-5 text-gray-600" />
            </div>

            <div className="p-4 md:p-6 flex justify-between items-center">
              <div>
                <span className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-[0.2em] block mb-1">Anomalies Détectées</span>
                <span className={`text-xl md:text-2xl font-mono ${systemStatus?.anomalies > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {systemStatus ? systemStatus.anomalies : '0'}
                </span>
              </div>
              <AlertCircle className={`h-5 w-5 ${systemStatus?.anomalies > 0 ? 'text-red-500' : 'text-gray-600'}`} />
            </div>
          </div>
        </div>

        {/* SCROLLABLE MAIN CANVAS */}
        <main className="flex-1 overflow-y-auto bg-black custom-scrollbar">
          
          {/* TAB DIRECTORY - Mobile horizontally scrollable */}
          <div className="flex border-b border-white/10 bg-[#050505] sticky top-0 md:static z-20 overflow-x-auto custom-scrollbar whitespace-nowrap">
            {[
              { id: 'import', label: "Terminal d'Importation" },
              { id: 'commerciaux', label: 'Registre Commerciaux' },
              { id: 'clients', label: 'Base Clients' },
              { id: 'articles', label: 'Référentiel Articles' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); handleCancelEdit(); }} 
                className={`px-6 md:px-8 py-3.5 md:py-4 text-[10px] md:text-[11px] uppercase tracking-widest font-medium transition-all flex-shrink-0 ${
                  activeTab === tab.id 
                    ? 'text-white border-b-2 border-red-600 bg-white/[0.02]' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.01]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 md:p-8">
            {/* CONTENT ROUTING */}
            {activeTab === 'commerciaux' && renderDbTable(
              dbData.commerciaux, 
              [
                { key: 'id_commercial', label: 'ID', editable: false },
                { key: 'nom_commercial', label: 'Nom du Commercial', editable: true },
                { key: 'division', label: 'Division', editable: true },
                { key: 'objectif_annuel', label: 'Objectif Annuel', editable: true, format: (val) => `${Number(val).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD` }
              ],
              'commerciaux', 'id_commercial'
            )}

            {activeTab === 'clients' && renderDbTable(
              dbData.clients, 
              [
                { key: 'code_client', label: 'Code Client', editable: false },
                { key: 'nom_client', label: 'Raison Sociale', editable: true }
              ],
              'clients', 'code_client'
            )}

            {activeTab === 'articles' && renderDbTable(
              dbData.articles, 
              [
                { key: 'code_article', label: 'Code Article', editable: false },
                { key: 'designation', label: 'Désignation', editable: true },
                { key: 'prix_unitaire_ref', label: 'Prix Unitaire', editable: true, format: (val) => `${Number(val).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD` }
              ],
              'articles', 'code_article'
            )}

            {activeTab === 'import' && (
              importedData.length === 0 ? (
                // THE INJECTION BUFFER (Upload Empty State)
                <div className="border border-dashed border-white/20 bg-white/[0.01] py-16 md:py-24 px-4 flex flex-col items-center justify-center text-center">
                  <FileUp className="h-10 w-10 text-gray-600 mb-6" />
                  <h3 className="text-lg md:text-xl font-serif text-white mb-2">Buffer d'Injection de Données</h3>
                  <p className="text-gray-500 mb-8 max-w-md text-[10px] md:text-xs uppercase tracking-widest font-mono">Format Requis : .xlsx, .csv</p>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
                  <button onClick={handleUploadClick} className="border border-red-600 text-red-500 hover:bg-red-600 hover:text-white px-6 md:px-8 py-3 text-[10px] md:text-[11px] uppercase tracking-widest transition-colors font-bold">
                    Initialiser le transfert
                  </button>
                </div>
              ) : (
                // PRE-SYNC PREVIEW
                <div className="animate-fade-in-up">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-6 border-b border-white/10 gap-4">
                    <div>
                      <h3 className="text-lg md:text-xl font-serif text-white">Prévisualisation du Buffer</h3>
                      <p className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-mono">{importedData.length} LIGNES EN ATTENTE</p>
                    </div>
                    <div className="flex flex-wrap gap-3 md:gap-4">
                      <button onClick={handleDiscard} className="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-500 hover:text-red-500 transition-colors flex items-center gap-2">
                        <Trash2 className="h-3 w-3" /> Purger
                      </button>
                      <button onClick={handleCleanData} className="text-[9px] md:text-[10px] uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2">
                        <Wand2 className="h-3 w-3" /> Formater
                      </button>
                      <button onClick={handleSyncToDatabase} className="bg-white text-black hover:bg-gray-200 px-5 md:px-6 py-2 text-[9px] md:text-[10px] uppercase tracking-widest font-bold transition-colors flex items-center gap-2">
                        <Send className="h-3 w-3" /> Exécuter Injection
                      </button>
                    </div>
                  </div>
                  
                  {/* PREVIEW TABLE */}
                  <div className="overflow-auto max-h-[600px] custom-scrollbar border border-white/10 bg-[#050505]">
                    <table className="w-full text-left border-collapse min-w-[700px] md:min-w-[800px]">
                      <thead className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/10">
                        <tr>
                          <th className="p-3 md:p-4 text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-gray-600 w-12 text-center border-r border-white/5">SEQ</th>
                          {fileHeaders.map((header, idx) => (
                            <th key={idx} onClick={() => handleSort(header)} className="p-3 md:p-4 text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-gray-500 cursor-pointer hover:text-white transition-colors">
                              <div className="flex items-center gap-2">{header} <ArrowUpDown className="h-3 w-3 opacity-30" /></div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {importedData.map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-3 md:p-4 text-xs font-mono text-gray-600 text-center border-r border-white/5">{rowIndex + 1}</td>
                            {fileHeaders.map((header, colIndex) => (
                              <td key={colIndex} className="p-3 md:p-4 text-xs md:text-sm font-mono text-gray-300">
                                {row[header] !== undefined && row[header] !== null && row[header] !== "" ? row[header] : <span className="text-red-500/50 text-xs">NULL</span>}
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

      {/* STRICT CINEMATIC TOAST */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 flex items-center gap-4 px-5 py-3 md:px-6 md:py-4 border-l-4 z-50 bg-[#111] border-y border-r border-white/10 text-xs md:text-sm font-medium transition-all animate-fade-in-up ${
          toast.type === 'success' ? 'border-l-emerald-500 text-white' : 
          toast.type === 'error' ? 'border-l-red-500 text-red-100' : 
          'border-l-blue-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
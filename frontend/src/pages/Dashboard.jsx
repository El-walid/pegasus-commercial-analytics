import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// HIGHCHARTS IMPORTS
import * as Highcharts from 'highcharts';
import HighchartsReactWrapper from 'highcharts-react-official';
import HC_more from 'highcharts/highcharts-more';
import sankey from 'highcharts/modules/sankey';
import Sidebar from '../components/Sidebar';

const HighchartsReact = HighchartsReactWrapper.default || HighchartsReactWrapper;

if (typeof HC_more === 'function') HC_more(Highcharts);
else if (HC_more && HC_more.default) HC_more.default(Highcharts);

if (typeof sankey === 'function') sankey(Highcharts);
else if (sankey && sankey.default) sankey.default(Highcharts);

import { Menu, X, Settings2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  // --- DEVELOPER TWEAKS BAR STATES ---
  const [showTweaks, setShowTweaks] = useState(false);
  const [devSettings, setDevSettings] = useState({
    accent: '#dc2626', // Default Red-600
    headingFont: 'font-serif', // Mix serif for editorial feel
    numberTracking: 'tracking-tighter', // Condensed numbers
    borderStyle: 'border-white/10' // Hairline borders
  });

  // Chart & Data States
  const [chartOptions, setChartOptions] = useState(null);
  const [pieOptions, setPieOptions] = useState(null);
  const [yoyOptions, setYoyOptions] = useState(null);
  const [bubbleOptions, setBubbleOptions] = useState(null);
  const [sankeyOptions, setSankeyOptions] = useState(null);
  
  const [kpiData, setKpiData] = useState(null);
  const [topClients, setTopClients] = useState([]);
  const [topCommerciaux, setTopCommerciaux] = useState([]);

  // Cross-Filtering States
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [selectedCommercial, setSelectedCommercial] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. Load Main Bar Chart & Leaderboard
  useEffect(() => {
    const token = localStorage.getItem('pegasus_token');
    if (!token) return navigate('/login');

    axios.get(`${import.meta.env.VITE_API_URL}/performances-commerciaux`)
      .then(response => {
        const data = response.data;
        const textColor = '#a3a3a3'; 

        setTopCommerciaux([...data].sort((a, b) => b.ca_realise - a.ca_realise));

        setChartOptions({
          chart: { type: 'column', backgroundColor: 'transparent', style: { fontFamily: 'inherit' } },
          title: { text: '' },
          xAxis: { 
            categories: data.map(item => item.nom_commercial), 
            crosshair: true, 
            labels: { style: { color: textColor, textTransform: 'uppercase', fontSize: '10px', fontWeight: '500' } },
            lineColor: 'rgba(255,255,255,0.1)',
            tickColor: 'rgba(255,255,255,0.1)'
          },
          yAxis: { 
            title: { text: '' }, 
            labels: { style: { color: textColor, fontSize: '10px' }, formatter: function () { return this.value >= 1000000 ? (this.value / 1000000).toFixed(1) + 'M' : this.value; } },
            gridLineColor: 'rgba(255,255,255,0.08)' 
          },
          tooltip: { valueSuffix: ' MAD', backgroundColor: '#000000', style: { color: '#ffffff' }, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 0, shadow: false },
          plotOptions: { 
            column: { borderRadius: 0, borderWidth: 0 },
            series: { cursor: 'pointer', point: { events: { click: function () { const clickedCom = this.category; setSelectedCommercial(prev => prev === clickedCom ? null : clickedCom); } } } } 
          },
          series: [
            { name: 'CA Réalisé', data: data.map(item => Number(item.ca_realise.toFixed(2))), color: devSettings.accent },
            { name: 'Objectif à ce jour', data: data.map(item => Number(item.objectif_attendu_a_ce_jour.toFixed(2))), color: '#404040' },
            { type: 'spline', name: 'Objectif Annuel', data: data.map(item => Number(item.objectif_annuel.toFixed(2))), color: '#ffffff', marker: { enabled: false }, lineWidth: 2, dashStyle: 'ShortDash' }
          ],
          legend: { enabled: true, itemStyle: { color: '#d4d4d8', fontWeight: '500', fontSize: '10px', textTransform: 'uppercase' }, margin: 20 },
          credits: { enabled: false }
        });
      }).catch(error => console.error("Erreur API", error));
  }, [devSettings.accent]); 

  // 2. Load Pie Chart
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/repartition-division`)
      .then(response => {
        const data = response.data;
        setPieOptions({
          chart: { type: 'pie', backgroundColor: 'transparent', style: { fontFamily: 'inherit' } },
          title: { text: '' },
          tooltip: { pointFormat: '<b>{point.y:,.2f} MAD</b><br/>({point.percentage:.1f}%)', backgroundColor: '#000000', style: { color: '#ffffff' }, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 0, shadow: false },
          plotOptions: { 
            pie: { 
              innerSize: '65%', 
              size: '55%', 
              borderWidth: 1, 
              borderColor: '#000', 
              allowPointSelect: true, 
              cursor: 'pointer', 
              showInLegend: true, 
              dataLabels: { enabled: true, format: '<b>{point.name}</b>', style: { fontWeight: '600', color: '#ffffff', textOutline: 'none', fontSize: '10px', textTransform: 'uppercase' }, distance: 15 }, 
              events: { click: function (event) { const clickedDiv = event.point.name; setSelectedDivision(prev => prev === clickedDiv ? null : clickedDiv); } } 
            } 
          },
          colors: [devSettings.accent, '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#737373'], 
          series: [{ name: 'CA', colorByPoint: true, data: data.map(item => ({ name: item.division, y: Number(parseFloat(item.ca).toFixed(2)) })) }],
          legend: { enabled: true, itemStyle: { color: '#d4d4d8', fontWeight: '500', fontSize: '10px' } },
          credits: { enabled: false }
        });
      }).catch(error => console.error("Erreur Pie Chart", error));
  }, [devSettings.accent]);

  // 3. Load YoY Chart
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/ca-yoy`)
      .then(response => {
        const data = response.data;
        const currentYear = Array(12).fill(0);
        const previousYear = Array(12).fill(0);
        data.forEach(row => {
          const mIndex = row.mois - 1;
          if(mIndex >= 0 && mIndex < 12) { currentYear[mIndex] = Number(row.ca_current) || 0; previousYear[mIndex] = Number(row.ca_previous) || 0; }
        });

        setYoyOptions({
          chart: { type: 'column', backgroundColor: 'transparent' },
          title: { text: '' },
          xAxis: { categories: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'], labels: { style: { color: '#a3a3a3', fontSize: '9px', textTransform: 'uppercase' } }, lineColor: 'rgba(255,255,255,0.1)' },
          yAxis: { title: { text: '' }, labels: { style: { color: '#a3a3a3' }, formatter: function() { return (this.value / 1000000).toFixed(0) + 'M'; } }, gridLineColor: 'rgba(255,255,255,0.08)' },
          tooltip: { shared: true, backgroundColor: '#000000', style: { color: '#ffffff' }, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 0, shadow: false },
          plotOptions: { column: { borderRadius: 0, borderWidth: 0, groupPadding: 0.1 } },
          colors: ['#404040', '#ffffff'], 
          series: [{ name: 'Année Précédente', data: previousYear }, { name: 'Année En Cours', data: currentYear }],
          legend: { enabled: true, itemStyle: { color: '#d4d4d8', fontWeight: '500', fontSize: '10px', textTransform: 'uppercase' } },
          credits: { enabled: false }
        });
      }).catch(err => console.error("Erreur YoY", err));
  }, []);

  // 4. Load BUBBLE Chart
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/bubble-commerciaux`)
      .then(response => {
        const bubbleData = response.data.map(item => ({ name: item.nom_commercial, x: Number(item.ca_realise), y: Number(item.ticket_moyen), z: Number(item.nb_factures) }));
        setBubbleOptions({
            chart: { type: 'bubble', backgroundColor: 'transparent', zoomType: 'xy' },
            title: { text: '' },
            xAxis: { title: { text: 'CA Total (MAD)', style: { color: '#a3a3a3', fontSize: '10px', textTransform: 'uppercase' } }, labels: { style: { color: '#a3a3a3' }, formatter: function() { return (this.value / 1000000).toFixed(1) + 'M'; } }, gridLineWidth: 1, gridLineColor: 'rgba(255,255,255,0.08)', lineColor: 'rgba(255,255,255,0.1)' },
            yAxis: { title: { text: 'Panier Moyen', style: { color: '#a3a3a3', fontSize: '10px', textTransform: 'uppercase' } }, labels: { style: { color: '#a3a3a3' }, formatter: function() { return (this.value / 1000).toFixed(0) + 'K'; } }, gridLineWidth: 1, gridLineColor: 'rgba(255,255,255,0.08)' },
            tooltip: { 
                useHTML: true, backgroundColor: '#000000', style: { color: '#ffffff' }, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 0, shadow: false, 
                headerFormat: '<table style="min-width: 150px;">', 
                pointFormat: '<tr><th colspan="2" style="padding-bottom: 8px; color: #a3a3a3; font-size: 10px; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: left;"><b>{point.name}</b></th></tr><tr><td style="padding-top: 8px; padding-right: 12px; color: #737373; font-size: 10px;">CA:</td><td style="padding-top: 8px; text-align: right; font-family: monospace; font-size: 11px; color: #ffffff;"><b>{point.x:,.2f}</b></td></tr><tr><td style="padding-right: 12px; color: #737373; font-size: 10px;">Panier:</td><td style="text-align: right; font-family: monospace; font-size: 11px; color: #ffffff;"><b>{point.y:,.2f}</b></td></tr>', 
                footerFormat: '</table>' 
            },
            plotOptions: { bubble: { minSize: 8, maxSize: 40, dataLabels: { enabled: true, format: '{point.name}', style: { color: '#ffffff', textOutline: 'none', fontWeight: '500', fontSize: '9px' }, allowOverlap: false } } },
            series: [{ name: 'Commerciaux', data: bubbleData, color: 'rgba(255,255,255,0.15)', marker: { fillOpacity: 0.3, lineWidth: 1.5, lineColor: '#ffffff' } }],
            legend: { enabled: true, itemStyle: { color: '#d4d4d8', fontWeight: '500', fontSize: '10px', textTransform: 'uppercase' } }, 
            credits: { enabled: false }
        });
      }).catch(err => console.error("Erreur Bubble", err));
  }, []);

  // 5. Load KPIs & Top Clients
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedDivision) params.append('division', selectedDivision);
    if (selectedCommercial) params.append('commercial', selectedCommercial);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    axios.get(`${import.meta.env.VITE_API_URL}/kpis${queryString}`)
      .then(res => setKpiData(res.data)).catch(err => console.error("Erreur KPIs", err));
      
    axios.get(`${import.meta.env.VITE_API_URL}/top-clients${queryString}`)
      .then(res => setTopClients(res.data)).catch(err => console.error("Erreur Clients", err));
  }, [selectedDivision, selectedCommercial]); 

  // Memoize sorted clients
  const sortedClients = useMemo(() => {
    return [...topClients].sort((a, b) => b.ca_total - a.ca_total);
  }, [topClients]);

  // 6. Load SANKEY Chart
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/sankey-flow`)
      .then(response => {
        setSankeyOptions({
          chart: { 
            backgroundColor: 'transparent',
            height: window.innerWidth < 768 ? 300 : 520 // Responsive internal SVG height
          },
          title: { text: '' },
          tooltip: { backgroundColor: '#000000', style: { color: '#ffffff' }, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 0, shadow: false, nodeFormat: '{point.name}: <b>{point.sum:,.0f} MAD</b><br/>', pointFormat: '{point.fromNode.name} → {point.toNode.name}: <b>{point.weight:,.0f} MAD</b><br/>' },
          colors: [devSettings.accent, '#f59e0b', '#0ea5e9', '#10b981', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b', '#84cc16'],
          series: [{ 
            keys: ['from', 'to', 'weight'], 
            data: response.data, 
            type: 'sankey', 
            turboThreshold: 0, 
            nodePadding: window.innerWidth < 768 ? 4 : 8,
            nodeWidth: window.innerWidth < 768 ? 20 : 35,
            minLinkWidth: 2,
            curveFactor: 0.33,
            dataLabels: { style: { color: '#ffffff', textOutline: 'none', fontSize: '9px', fontWeight: '500', textTransform: 'uppercase' } } 
          }],
          credits: { enabled: false }
        });
      }).catch(err => console.error("Erreur Sankey", err));
  }, [devSettings.accent]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-black text-gray-200 font-sans relative selection:bg-white/20 selection:text-white">
      
      {/* GLOBAL SIDEBAR */}
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      {/* MAIN CONTENT AREA - RESPONSIVE SPLIT */}
      {/* Changed to flex-col for mobile scroll, md:flex-row to split on desktop */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative z-10">
        
        {/* MOBILE HEADER (Sticky for scrolling) */}
        <header className="md:hidden flex-shrink-0 bg-black/90 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center z-30 sticky top-0">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-white transition-colors">
            <Menu className="h-6 w-6" />
          </button>
          <h1 className={`text-xl font-bold text-white ${devSettings.headingFont}`}>Tableau de Bord</h1>
        </header>

        {/* CONTAINER FOR SCROLLING: Single scroll on Mobile, Split scroll on Desktop */}
        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden w-full h-full">
          
          {/* --- LEFT COLUMN: THE EXECUTIVE LEDGER --- */}
          <aside className={`w-full md:w-[30%] lg:w-[25%] flex-shrink-0 border-b md:border-b-0 md:border-r ${devSettings.borderStyle} flex flex-col md:h-full bg-black md:overflow-y-auto custom-scrollbar`}>
            <div className="p-8 hidden md:flex justify-between items-start border-b border-white/10">
               <div>
                  <h1 className={`text-3xl text-white ${devSettings.headingFont} tracking-tight`}>Registre Exécutif</h1>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mt-2">Vue Financière Globale</p>
               </div>
               <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                  className="text-gray-500 hover:text-white transition-colors p-2 rounded-md hover:bg-white/5"
               >
                  {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
               </button>
            </div>

           {/* UPDATED: 2x2 Grid on Mobile, Vertical Stack on Desktop */}
            <div className="grid grid-cols-2 gap-6 p-6 border-b border-white/10 md:border-b-0 md:flex md:flex-col md:p-8 md:gap-0 md:space-y-12">
              {[
                { title: "Chiffre d'Affaires", value: kpiData ? `${kpiData.total_ca}` : "...", suffix: "MAD" },
                { title: "Objectif Atteint", value: kpiData ? kpiData.objectif_atteint.replace('%', '') : "...", suffix: "%", useAccent: true },
                { title: "Commerciaux Actifs", value: kpiData ? kpiData.commerciaux_actifs : "...", suffix: "Reps" },
                { title: "Top Performeur", value: kpiData ? kpiData.top_vendeur : "...", suffix: "" },
              ].map((kpi, idx) => (
                <div key={idx} className="flex flex-col group relative">
                  <span className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-1 md:mb-2">{kpi.title}</span>
                  <div className="flex items-baseline gap-1">
                    {/* Shrink text specifically on mobile (text-2xl) so it fits the 2x2 grid cleanly */}
                    <span 
                      className={`text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white ${devSettings.numberTracking} transition-colors duration-500`} 
                      style={kpi.useAccent ? { color: devSettings.accent } : {}}
                    >
                      {kpi.value}
                    </span>
                    {kpi.suffix && <span className="text-[9px] md:text-sm text-gray-500 font-medium ml-1">{kpi.suffix}</span>}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* --- RIGHT COLUMN: THE SCROLLABLE CANVAS --- */}
          <main className="flex-1 w-full bg-black md:h-full md:overflow-y-auto custom-scrollbar relative flex flex-col">
            
            {/* Active Filters Bar */}
            {(selectedDivision || selectedCommercial) && (
              <div className={`sticky top-0 z-20 bg-black/90 backdrop-blur px-6 md:px-8 py-3 border-b ${devSettings.borderStyle} flex items-center gap-4`}>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest hidden sm:inline">Filtres Actifs :</span>
                {selectedDivision && <button onClick={() => setSelectedDivision(null)} className="text-[10px] md:text-xs text-white uppercase tracking-wider flex items-center gap-2 hover:text-gray-400">Div: {selectedDivision} <X className="h-3 w-3"/></button>}
                {selectedCommercial && <button onClick={() => setSelectedCommercial(null)} className="text-[10px] md:text-xs text-white uppercase tracking-wider flex items-center gap-2 hover:text-gray-400">Rep: {selectedCommercial} <X className="h-3 w-3"/></button>}
              </div>
            )}

            {/* Secondary KPIs Row - Responsive Borders */}
            <div className={`grid grid-cols-2 md:grid-cols-4 border-b ${devSettings.borderStyle}`}>
              {[
                { label: "Top Client", val: kpiData ? kpiData.top_client : "..." },
                { label: "Article Leader", val: kpiData ? kpiData.top_article : "..." },
                { label: "Volume Factures", val: kpiData ? kpiData.nb_factures : "..." },
                { label: "Panier Moyen", val: kpiData ? `${kpiData.ticket_moyen}` : "..." },
              ].map((item, idx) => (
                <div key={idx} className={`p-4 md:p-6 flex flex-col justify-center ${devSettings.borderStyle} 
                  ${idx % 2 === 0 ? 'border-r' : ''} 
                  md:border-r md:last:border-r-0
                  ${idx < 2 ? 'border-b md:border-b-0' : ''}
                `}>
                  <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em] mb-1">{item.label}</span>
                  <span className="text-sm text-white font-medium truncate" title={item.val}>{item.val}</span>
                </div>
              ))}
            </div>

            <div className="p-4 md:p-8 space-y-8 md:space-y-12">
              
              {/* Primary Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="flex justify-between items-end mb-4 md:mb-6 border-b border-white/10 pb-4">
                    <h3 className={`text-xl md:text-2xl text-white ${devSettings.headingFont}`}>Réalisé vs Objectifs</h3>
                  </div>
                  <div className="h-[300px] md:h-[400px]">
                    {chartOptions ? <HighchartsReact highcharts={Highcharts} options={chartOptions} containerProps={{ style: { height: '100%' } }} /> : <div className="h-full flex items-center justify-center text-gray-700">Chargement...</div>}
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-end mb-4 md:mb-6 border-b border-white/10 pb-4">
                    <h3 className={`text-xl md:text-2xl text-white ${devSettings.headingFont}`}>CA par Division</h3>
                  </div>
                  <div className="h-[300px] md:h-[400px]">
                    {pieOptions ? <HighchartsReact highcharts={Highcharts} options={pieOptions} containerProps={{ style: { height: '100%' } }} /> : <div className="h-full flex items-center justify-center text-gray-700">Chargement...</div>}
                  </div>
                </div>
              </div>

              {/* Tables & Lists */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <div className="lg:col-span-2 flex flex-col">
                  <div className="flex justify-between items-end mb-4 md:mb-6 border-b border-white/10 pb-4">
                    <h3 className={`text-xl md:text-2xl text-white ${devSettings.headingFont}`}>Portefeuille Clients</h3>
                  </div>
                  <div className="overflow-x-auto w-full custom-scrollbar">
                    <div className="overflow-y-auto max-h-[400px] custom-scrollbar pr-2 md:pr-4 min-w-[500px]">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-black z-10">
                          <tr>
                            <th className="pb-4 font-normal text-[9px] md:text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/10 w-1/4">Compte Client</th>
                            <th className="pb-4 font-normal text-[9px] md:text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/10 text-center">Cmds</th>
                            <th className="pb-4 font-normal text-[9px] md:text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/10 text-right">Volume (MAD)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedClients.map((client, index) => (
                            <tr key={index} className="group hover:bg-white/[0.03] transition-colors">
                              <td className="py-4 border-b border-white/5 text-xs md:text-sm text-gray-300 truncate max-w-[150px] md:max-w-[200px]">{client.nom_client}</td>
                              <td className="py-4 border-b border-white/5 text-xs md:text-sm text-gray-500 text-center">{client.nb_commandes}</td>
                              <td className="py-4 border-b border-white/5 text-xs md:text-sm text-white text-right font-mono">
                                {Number(client.ca_total).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col">
                   <div className="flex justify-between items-end mb-4 md:mb-6 border-b border-white/10 pb-4">
                    <h3 className={`text-xl md:text-2xl text-white ${devSettings.headingFont}`}>Classement</h3>
                  </div>
                  <div className="space-y-4 md:space-y-5 overflow-y-auto max-h-[400px] custom-scrollbar pr-2 md:pr-4">
                    {topCommerciaux.map((rep, index) => {
                      const progress = rep.objectif_annuel > 0 ? Math.min((rep.ca_realise / rep.objectif_annuel) * 100, 100) : 0;
                      let barColor = 'bg-red-500/80';
                      if (progress >= 100) barColor = 'bg-emerald-500/80';
                      else if (progress >= 75) barColor = 'bg-blue-500/80';
                      else if (progress >= 50) barColor = 'bg-amber-500/80';

                      return (
                        <div key={index} className="flex flex-col pb-4 border-b border-white/5 last:border-b-0">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex gap-3 md:gap-4 items-center">
                              <span className="text-[9px] md:text-[10px] text-gray-600 font-mono">0{index + 1}</span>
                              <span className="text-xs md:text-sm text-gray-300 font-medium">{rep.nom_commercial}</span>
                            </div>
                            <span className="text-xs md:text-sm text-white font-mono">{(rep.ca_realise / 1000000).toFixed(2)}M</span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                            <div className={`h-1 rounded-full transition-all duration-1000 ease-out ${barColor}`} style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Technical Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                   <div className="flex justify-between items-end mb-4 md:mb-6 border-b border-white/10 pb-4">
                    <h3 className={`text-xl md:text-2xl text-white ${devSettings.headingFont}`}>Croissance YoY</h3>
                  </div>
                  <div className="h-[300px] md:h-[350px]">
                    {yoyOptions ? <HighchartsReact highcharts={Highcharts} options={yoyOptions} containerProps={{ style: { height: '100%' } }} /> : null}
                  </div>
                </div>
                <div>
                   <div className="flex justify-between items-end mb-4 md:mb-6 border-b border-white/10 pb-4">
                    <h3 className={`text-xl md:text-2xl text-white ${devSettings.headingFont}`}>Matrice Portefeuille</h3>
                  </div>
                  <div className="h-[300px] md:h-[350px]">
                    {bubbleOptions ? <HighchartsReact highcharts={Highcharts} options={bubbleOptions} containerProps={{ style: { height: '100%' } }} /> : null}
                  </div>
                </div>
              </div>

              {/* Massive Wide Sankey */}
              <div className="pb-8 md:pb-12">
                 <div className="flex justify-between items-end mb-4 md:mb-6 border-b border-white/10 pb-4">
                    <h3 className={`text-xl md:text-2xl text-white ${devSettings.headingFont}`}>Topologie Flux</h3>
                  </div>
                <div className="h-[300px] md:h-[520px]">
                  {sankeyOptions ? <HighchartsReact highcharts={Highcharts} options={sankeyOptions} containerProps={{ style: { height: '100%' } }} /> : null}
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>

      {/* --- DEVELOPER TWEAKS BAR --- */}
      <div className={`fixed bottom-4 md:bottom-6 right-4 md:right-6 z-50 flex flex-col items-end transition-all duration-300 ${showTweaks ? 'translate-x-0' : 'translate-x-[calc(100%-3rem)] md:translate-x-[calc(100%-3rem)]'}`}>
        <div className="flex items-start shadow-2xl">
          <button 
            onClick={() => setShowTweaks(!showTweaks)} 
            className="p-3 bg-white text-black hover:bg-gray-200 transition-colors"
          >
            <Settings2 className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          
          <div className="bg-[#111] border border-white/10 p-4 md:p-5 w-64 md:w-72 flex flex-col gap-4 md:gap-5">
            <h4 className="text-[10px] md:text-xs font-mono text-gray-500 uppercase tracking-widest border-b border-white/10 pb-2">Options Dev</h4>
            
            <div>
              <label className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-wider block mb-2">Couleur d'Accent</label>
              <div className="flex gap-2">
                {['#dc2626', '#f59e0b', '#06b6d4', '#ffffff'].map(color => (
                  <button 
                    key={color} 
                    onClick={() => setDevSettings(p => ({ ...p, accent: color }))}
                    className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 ${devSettings.accent === color ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-wider block mb-2">Typographie</label>
              <div className="flex bg-black border border-white/10 p-1">
                <button onClick={() => setDevSettings(p => ({ ...p, headingFont: 'font-sans' }))} className={`flex-1 text-[10px] md:text-xs py-1.5 ${devSettings.headingFont === 'font-sans' ? 'bg-white text-black' : 'text-gray-400'}`}>Sans</button>
                <button onClick={() => setDevSettings(p => ({ ...p, headingFont: 'font-serif italic' }))} className={`flex-1 text-[10px] md:text-xs py-1.5 ${devSettings.headingFont === 'font-serif italic' ? 'bg-white text-black' : 'text-gray-400'}`}>Serif</button>
              </div>
            </div>

            <div>
               <label className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-wider block mb-2">Bordures</label>
               <div className="flex bg-black border border-white/10 p-1">
                <button onClick={() => setDevSettings(p => ({ ...p, borderStyle: 'border-white/10' }))} className={`flex-1 text-[10px] md:text-xs py-1.5 ${devSettings.borderStyle === 'border-white/10' ? 'bg-white text-black' : 'text-gray-400'}`}>Fines</button>
                <button onClick={() => setDevSettings(p => ({ ...p, borderStyle: 'border-transparent' }))} className={`flex-1 text-[10px] md:text-xs py-1.5 ${devSettings.borderStyle === 'border-transparent' ? 'bg-white text-black' : 'text-gray-400'}`}>Minimales</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
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
            labels: { style: { color: textColor, textTransform: 'uppercase', fontSize: '11px', fontWeight: '500' } },
            lineColor: 'rgba(255,255,255,0.1)',
            tickColor: 'rgba(255,255,255,0.1)'
          },
          yAxis: { 
            title: { text: '' }, 
            labels: { style: { color: textColor, fontSize: '11px' }, formatter: function () { return this.value >= 1000000 ? (this.value / 1000000).toFixed(1) + 'M' : this.value; } },
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
          legend: { enabled: true, itemStyle: { color: '#d4d4d8', fontWeight: '500', fontSize: '11px', textTransform: 'uppercase' }, margin: 20 },
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
              innerSize: '50%', 
              size: '50%', 
              borderWidth: 1, 
              borderColor: '#000', 
              allowPointSelect: true, 
              cursor: 'pointer', 
              showInLegend: true, 
              dataLabels: { enabled: true, format: '<b>{point.name}</b>', style: { fontWeight: '600', color: '#ffffff', textOutline: 'none', fontSize: '11px', textTransform: 'uppercase' }, distance: 15 }, 
              events: { click: function (event) { const clickedDiv = event.point.name; setSelectedDivision(prev => prev === clickedDiv ? null : clickedDiv); } } 
            } 
          },
          colors: [devSettings.accent, '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#737373'], 
          series: [{ name: 'CA', colorByPoint: true, data: data.map(item => ({ name: item.division, y: Number(parseFloat(item.ca).toFixed(2)) })) }],
          legend: { enabled: true, itemStyle: { color: '#d4d4d8', fontWeight: '500', fontSize: '11px' } },
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
          xAxis: { categories: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'], labels: { style: { color: '#a3a3a3', fontSize: '10px', textTransform: 'uppercase' } }, lineColor: 'rgba(255,255,255,0.1)' },
          yAxis: { title: { text: '' }, labels: { style: { color: '#a3a3a3' }, formatter: function() { return (this.value / 1000000).toFixed(0) + 'M'; } }, gridLineColor: 'rgba(255,255,255,0.08)' },
          tooltip: { shared: true, backgroundColor: '#000000', style: { color: '#ffffff' }, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 0, shadow: false },
          plotOptions: { column: { borderRadius: 0, borderWidth: 0, groupPadding: 0.1 } },
          colors: ['#404040', '#ffffff'], 
          series: [{ name: 'Année Précédente', data: previousYear }, { name: 'Année En Cours', data: currentYear }],
          legend: { enabled: true, itemStyle: { color: '#d4d4d8', fontWeight: '500', fontSize: '11px', textTransform: 'uppercase' } },
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
            xAxis: { title: { text: 'CA Total (MAD)', style: { color: '#a3a3a3', fontSize: '11px', textTransform: 'uppercase' } }, labels: { style: { color: '#a3a3a3' }, formatter: function() { return (this.value / 1000000).toFixed(1) + 'M'; } }, gridLineWidth: 1, gridLineColor: 'rgba(255,255,255,0.08)', lineColor: 'rgba(255,255,255,0.1)' },
            yAxis: { title: { text: 'Panier Moyen', style: { color: '#a3a3a3', fontSize: '11px', textTransform: 'uppercase' } }, labels: { style: { color: '#a3a3a3' }, formatter: function() { return (this.value / 1000).toFixed(0) + 'K'; } }, gridLineWidth: 1, gridLineColor: 'rgba(255,255,255,0.08)' },
            tooltip: {
                useHTML: true,
                backgroundColor: '#000000', // Pure pitch black
                style: { color: '#ffffff' },
                borderColor: 'rgba(255,255,255,0.2)', // Hairline white border
                borderRadius: 0, // Sharp 90-degree corners
                shadow: false, // Kill the soft glow
                headerFormat: '<table style="min-width: 180px;">',
                pointFormat: 
                    // HEADER: Uppercase, spaced, with a subtle hairline divider underneath
                    '<tr><th colspan="2" style="padding-bottom: 8px; color: #a3a3a3; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: left;"><b>{point.name}</b></th></tr>' +
                    // ROW 1: CA Total
                    '<tr><td style="padding-top: 10px; padding-right: 16px; color: #737373; font-size: 11px;">CA Total :</td>' +
                    '<td style="padding-top: 10px; text-align: right; font-family: monospace; font-size: 12px; color: #ffffff;"><b>{point.x:,.2f}</b></td></tr>' +
                    // ROW 2: Panier Moyen
                    '<tr><td style="padding-right: 16px; color: #737373; font-size: 11px;">Panier Moyen :</td>' +
                    '<td style="text-align: right; font-family: monospace; font-size: 12px; color: #ffffff;"><b>{point.y:,.2f}</b></td></tr>' +
                    // ROW 3: Nb Commandes
                    '<tr><td style="padding-right: 16px; color: #737373; font-size: 11px;">Commandes :</td>' +
                    '<td style="text-align: right; font-family: monospace; font-size: 12px; color: #ffffff;"><b>{point.z}</b></td></tr>',
                footerFormat: '</table>'
            },
            plotOptions: { bubble: { minSize: 8, maxSize: 40, dataLabels: { enabled: true, format: '{point.name}', style: { color: '#ffffff', textOutline: 'none', fontWeight: '500', fontSize: '10px' }, allowOverlap: false } } },
            series: [{ name: 'Commerciaux', data: bubbleData, color: 'rgba(255,255,255,0.15)', marker: { fillOpacity: 0.3, lineWidth: 1.5, lineColor: '#ffffff' } }],
            legend: { enabled: true, itemStyle: { color: '#d4d4d8', fontWeight: '500', fontSize: '11px', textTransform: 'uppercase' } }, 
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

  // 6. Load SANKEY Chart (Massively upgraded for visibility)
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/sankey-flow`)
      .then(response => {
        setSankeyOptions({
          chart: { 
            backgroundColor: 'transparent',
            height: 450 // FORCED INTERNAL SVG HEIGHT TO PREVENT NODE SQUISHING
          },
          title: { text: '' },
          tooltip: { backgroundColor: '#000000', style: { color: '#ffffff' }, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 0, shadow: false, nodeFormat: '{point.name}: <b>{point.sum:,.0f} MAD</b><br/>', pointFormat: '{point.fromNode.name} → {point.toNode.name}: <b>{point.weight:,.0f} MAD</b><br/>' },
          colors: [devSettings.accent, '#f59e0b', '#0ea5e9', '#10b981', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b', '#84cc16'],
          series: [{ 
            keys: ['from', 'to', 'weight'], 
            data: response.data, 
            type: 'sankey', 
            turboThreshold: 0, 
            nodePadding: 8, // Very tight padding so the actual colored blocks take up the space
            nodeWidth: 35,  // Thicker blocks
            minLinkWidth: 2, // Forces tiny data streams to remain visible
            curveFactor: 0.33,
            dataLabels: { style: { color: '#ffffff', textOutline: 'none', fontSize: '11px', fontWeight: '500', textTransform: 'uppercase' } } 
          }],
          credits: { enabled: false }
        });
      }).catch(err => console.error("Erreur Sankey", err));
  }, [devSettings.accent]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-black text-gray-200 font-sans relative selection:bg-white/20 selection:text-white">
      
      {/* GLOBAL SIDEBAR */}
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      {/* MAIN CONTENT AREA - CINEMATIC SPLIT */}
      <div className="flex-1 flex flex-col md:flex-row min-w-0 h-screen relative z-10">
        
        {/* MOBILE HEADER */}
        <header className="md:hidden flex-shrink-0 bg-black border-b border-white/10 px-6 py-4 flex justify-between items-center z-20">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-white transition-colors">
            <Menu className="h-6 w-6" />
          </button>
          <h1 className={`text-xl font-bold text-white ${devSettings.headingFont}`}>Tableau de Bord</h1>
        </header>

        {/* --- LEFT COLUMN: THE EXECUTIVE LEDGER --- */}
        <aside className={`w-full md:w-[30%] lg:w-[25%] flex-shrink-0 border-r ${devSettings.borderStyle} flex flex-col h-full bg-black overflow-y-auto custom-scrollbar`}>
          <div className="p-8 hidden md:flex justify-between items-start border-b border-white/10">
             <div>
                <h1 className={`text-3xl text-white ${devSettings.headingFont} tracking-tight`}>Registre Exécutif</h1>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-2">Vue Financière Globale</p>
             </div>
             {/* Desktop Sidebar Toggle Button inside the Ledger */}
             <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="text-gray-500 hover:text-white transition-colors p-2 rounded-md hover:bg-white/5"
                title="Basculer la navigation"
             >
                {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
             </button>
          </div>

          <div className="flex flex-col p-8 space-y-12">
            {[
              { title: "Chiffre d'Affaires", value: kpiData ? `${kpiData.total_ca}` : "...", suffix: "MAD" },
              { title: "Objectif Atteint", value: kpiData ? kpiData.objectif_atteint.replace('%', '') : "...", suffix: "%", useAccent: true },
              { title: "Commerciaux Actifs", value: kpiData ? kpiData.commerciaux_actifs : "...", suffix: "Reps" },
              { title: "Top Performeur", value: kpiData ? kpiData.top_vendeur : "...", suffix: "" },
            ].map((kpi, idx) => (
              <div key={idx} className="flex flex-col group relative">
                <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-2">{kpi.title}</span>
                <div className="flex items-baseline gap-1">
                  <span 
                    className={`text-5xl lg:text-6xl font-bold text-white ${devSettings.numberTracking} transition-colors duration-500`} 
                    style={kpi.useAccent ? { color: devSettings.accent } : {}}
                  >
                    {kpi.value}
                  </span>
                  {kpi.suffix && <span className="text-sm text-gray-500 font-medium ml-1">{kpi.suffix}</span>}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* --- RIGHT COLUMN: THE SCROLLABLE CANVAS --- */}
        <main className="flex-1 overflow-y-auto bg-black custom-scrollbar relative flex flex-col">
          
          {/* Active Filters Bar */}
          {(selectedDivision || selectedCommercial) && (
            <div className={`sticky top-0 z-30 bg-black/90 backdrop-blur px-8 py-3 border-b ${devSettings.borderStyle} flex items-center gap-4`}>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Filtres Actifs :</span>
              {selectedDivision && <button onClick={() => setSelectedDivision(null)} className="text-xs text-white uppercase tracking-wider flex items-center gap-2 hover:text-gray-400">Division: {selectedDivision} <X className="h-3 w-3"/></button>}
              {selectedCommercial && <button onClick={() => setSelectedCommercial(null)} className="text-xs text-white uppercase tracking-wider flex items-center gap-2 hover:text-gray-400">Rep: {selectedCommercial} <X className="h-3 w-3"/></button>}
            </div>
          )}

          {/* Secondary KPIs Row (Top of Canvas) */}
          <div className={`grid grid-cols-2 md:grid-cols-4 border-b ${devSettings.borderStyle}`}>
            {[
              { label: "Top Client", val: kpiData ? kpiData.top_client : "..." },
              { label: "Article Leader", val: kpiData ? kpiData.top_article : "..." },
              { label: "Volume Factures", val: kpiData ? kpiData.nb_factures : "..." },
              { label: "Panier Moyen", val: kpiData ? `${kpiData.ticket_moyen}` : "..." },
            ].map((item, idx) => (
              <div key={idx} className={`p-6 border-r ${devSettings.borderStyle} last:border-r-0 flex flex-col justify-center`}>
                <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em] mb-1">{item.label}</span>
                <span className="text-sm text-white font-medium truncate" title={item.val}>{item.val}</span>
              </div>
            ))}
          </div>

          <div className="p-8 space-y-12">
            
            {/* Primary Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                  <h3 className={`text-2xl text-white ${devSettings.headingFont}`}>Réalisé vs Objectifs</h3>
                </div>
                <div className="h-[400px]">
                  {chartOptions ? <HighchartsReact highcharts={Highcharts} options={chartOptions} containerProps={{ style: { height: '100%' } }} /> : <div className="h-full flex items-center justify-center text-gray-700">Chargement...</div>}
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                  <h3 className={`text-2xl text-white ${devSettings.headingFont}`}>CA par Division</h3>
                </div>
                <div className="h-[400px]">
                  {pieOptions ? <HighchartsReact highcharts={Highcharts} options={pieOptions} containerProps={{ style: { height: '100%' } }} /> : <div className="h-full flex items-center justify-center text-gray-700">Chargement...</div>}
                </div>
              </div>
            </div>

            {/* Tables & Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Scrollable & Sorted Client Ledger */}
              <div className="lg:col-span-2 flex flex-col">
                <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                  <h3 className={`text-2xl text-white ${devSettings.headingFont}`}>Portefeuille Clients</h3>
                </div>
                <div className="overflow-y-auto max-h-[400px] custom-scrollbar pr-4">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead className="sticky top-0 bg-black z-10">
                      <tr>
                        <th className="pb-4 font-normal text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/10 w-1/4">Compte Client</th>
                        <th className="pb-4 font-normal text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/10 text-center">Cmds</th>
                        <th className="pb-4 font-normal text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/10 text-right">Volume (MAD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedClients.map((client, index) => (
                        <tr key={index} className="group hover:bg-white/[0.03] transition-colors">
                          <td className="py-4 border-b border-white/5 text-sm text-gray-300 truncate max-w-[200px]">{client.nom_client}</td>
                          <td className="py-4 border-b border-white/5 text-sm text-gray-500 text-center">{client.nb_commandes}</td>
                          <td className="py-4 border-b border-white/5 text-sm text-white text-right font-mono">
                            {Number(client.ca_total).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Leaderboard with Polished Progress Bars */}
              <div className="flex flex-col">
                 <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                  <h3 className={`text-2xl text-white ${devSettings.headingFont}`}>Classement Commerciaux</h3>
                </div>
                <div className="space-y-5 overflow-y-auto max-h-[400px] custom-scrollbar pr-4">
                  {topCommerciaux.map((rep, index) => {
                    const progress = rep.objectif_annuel > 0 ? Math.min((rep.ca_realise / rep.objectif_annuel) * 100, 100) : 0;
                    
                    let barColor = 'bg-red-500/80';
                    if (progress >= 100) barColor = 'bg-emerald-500/80';
                    else if (progress >= 75) barColor = 'bg-blue-500/80';
                    else if (progress >= 50) barColor = 'bg-amber-500/80';

                    return (
                      <div key={index} className="flex flex-col pb-4 border-b border-white/5 last:border-b-0">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex gap-4 items-center">
                            <span className="text-[10px] text-gray-600 font-mono">0{index + 1}</span>
                            <span className="text-sm text-gray-300 font-medium">{rep.nom_commercial}</span>
                          </div>
                          <span className="text-sm text-white font-mono">{(rep.ca_realise / 1000000).toFixed(2)}M</span>
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
                 <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                  <h3 className={`text-2xl text-white ${devSettings.headingFont}`}>Croissance YoY (N vs N-1)</h3>
                </div>
                <div className="h-[350px]">
                  {yoyOptions ? <HighchartsReact highcharts={Highcharts} options={yoyOptions} containerProps={{ style: { height: '100%' } }} /> : null}
                </div>
              </div>
              <div>
                 <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                  <h3 className={`text-2xl text-white ${devSettings.headingFont}`}>Matrice Portefeuille</h3>
                </div>
                <div className="h-[350px]">
                  {bubbleOptions ? <HighchartsReact highcharts={Highcharts} options={bubbleOptions} containerProps={{ style: { height: '100%' } }} /> : null}
                </div>
              </div>
            </div>

            {/* Massive Wide Sankey */}
            <div className="pb-12">
               <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                  <h3 className={`text-2xl text-white ${devSettings.headingFont}`}>Topologie des Flux Financiers</h3>
                </div>
              <div className="h-[450px]">
                {sankeyOptions ? <HighchartsReact highcharts={Highcharts} options={sankeyOptions} containerProps={{ style: { height: '100%' } }} /> : null}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* --- DEVELOPER TWEAKS BAR --- */}
      <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end transition-all duration-300 ${showTweaks ? 'translate-x-0' : 'translate-x-[calc(100%-3rem)]'}`}>
        <div className="flex items-start">
          <button 
            onClick={() => setShowTweaks(!showTweaks)} 
            className="p-3 bg-white text-black shadow-2xl hover:bg-gray-200 transition-colors"
            title="Design Tweaks"
          >
            <Settings2 className="h-5 w-5" />
          </button>
          
          <div className="bg-[#111] border border-white/10 p-5 shadow-2xl w-72 flex flex-col gap-5">
            <h4 className="text-xs font-mono text-gray-500 uppercase tracking-widest border-b border-white/10 pb-2">Options Développeur</h4>
            
            {/* Accent Color */}
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-2">Couleur d'Accent</label>
              <div className="flex gap-2">
                {['#dc2626', '#f59e0b', '#06b6d4', '#ffffff'].map(color => (
                  <button 
                    key={color} 
                    onClick={() => setDevSettings(p => ({ ...p, accent: color }))}
                    className={`w-6 h-6 rounded-full border-2 ${devSettings.accent === color ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Heading Font */}
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-2">Typographie</label>
              <div className="flex bg-black border border-white/10 p-1">
                <button 
                  onClick={() => setDevSettings(p => ({ ...p, headingFont: 'font-sans' }))}
                  className={`flex-1 text-xs py-1.5 ${devSettings.headingFont === 'font-sans' ? 'bg-white text-black' : 'text-gray-400'}`}
                >Modern Sans</button>
                <button 
                  onClick={() => setDevSettings(p => ({ ...p, headingFont: 'font-serif italic' }))}
                  className={`flex-1 text-xs py-1.5 ${devSettings.headingFont === 'font-serif italic' ? 'bg-white text-black' : 'text-gray-400'}`}
                >Editorial Serif</button>
              </div>
            </div>

            {/* Grid Density */}
            <div>
               <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-2">Bordures</label>
               <div className="flex bg-black border border-white/10 p-1">
                <button 
                  onClick={() => setDevSettings(p => ({ ...p, borderStyle: 'border-white/10' }))}
                  className={`flex-1 text-xs py-1.5 ${devSettings.borderStyle === 'border-white/10' ? 'bg-white text-black' : 'text-gray-400'}`}
                >Lignes fines</button>
                <button 
                  onClick={() => setDevSettings(p => ({ ...p, borderStyle: 'border-transparent' }))}
                  className={`flex-1 text-xs py-1.5 ${devSettings.borderStyle === 'border-transparent' ? 'bg-white text-black' : 'text-gray-400'}`}
                >Minimal</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
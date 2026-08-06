import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

// HIGHCHARTS IMPORTS (Bulletproof Vite Setup)
import * as Highcharts from 'highcharts';
import HighchartsReactWrapper from 'highcharts-react-official';
import HC_more from 'highcharts/highcharts-more';
import sankey from 'highcharts/modules/sankey';
import Sidebar from '../components/Sidebar';

const HighchartsReact = HighchartsReactWrapper.default || HighchartsReactWrapper;

if (typeof HC_more === 'function') {
  HC_more(Highcharts);
} else if (HC_more && HC_more.default) {
  HC_more.default(Highcharts);
}

if (typeof sankey === 'function') sankey(Highcharts);
else if (sankey && sankey.default) sankey.default(Highcharts);

import { 
  LayoutDashboard, Database, Bot, Settings, LogOut, TrendingUp, Users, Target, 
  Award, Briefcase, Package, FileText, ShoppingCart, Menu, X, Trophy, Sparkles 
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // UI States (Detects PC to open by default)
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

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

  // Resize Listener for Sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('pegasus_token');
    navigate('/login');
  };

  // 1. Load Main Bar Chart & Leaderboard
  useEffect(() => {
    const token = localStorage.getItem('pegasus_token');
    if (!token) return navigate('/login');

    axios.get(`${import.meta.env.VITE_API_URL}/performances-commerciaux`)
      .then(response => {
        const data = response.data;
        const textColor = '#9ca3af'; 

        setTopCommerciaux([...data].sort((a, b) => b.ca_realise - a.ca_realise));

        setChartOptions({
          chart: { type: 'column', backgroundColor: 'transparent', style: { fontFamily: 'Inter, sans-serif' } },
          title: { text: '' },
          xAxis: { 
            categories: data.map(item => item.nom_commercial), 
            crosshair: true, 
            labels: { style: { color: textColor } },
            lineColor: 'rgba(255,255,255,0.1)',
            tickColor: 'rgba(255,255,255,0.1)'
          },
          yAxis: { 
            title: { text: 'Total HT (MAD)', style: { color: textColor } }, 
            labels: { 
              style: { color: textColor }, 
              formatter: function () { 
                if (this.value >= 1000000) return (this.value / 1000000).toFixed(1) + 'M'; 
                return this.value; 
              } 
            },
            gridLineColor: 'rgba(255,255,255,0.05)'
          },
          tooltip: { 
            valueSuffix: ' MAD', 
            valueDecimals: 2, 
            backgroundColor: '#0f1524', 
            style: { color: '#ffffff' },
            borderColor: 'rgba(255,255,255,0.1)'
          },
          plotOptions: { 
            column: { borderRadius: 6 },
            series: { 
              cursor: 'pointer', 
              point: { 
                events: { 
                  click: function () { 
                    const clickedCom = this.category; 
                    setSelectedCommercial(prev => prev === clickedCom ? null : clickedCom); 
                  } 
                } 
              } 
            } 
          },
          series: [
            { name: 'CA Réalisé', data: data.map(item => Number(item.ca_realise.toFixed(2))), color: '#10b981' },
            { name: 'Objectif à ce jour', data: data.map(item => Number(item.objectif_attendu_a_ce_jour.toFixed(2))), color: '#3b82f6' },
            { type: 'spline', name: 'Objectif Annuel', data: data.map(item => Number(item.objectif_annuel.toFixed(2))), color: '#ef4444', marker: { enabled: false }, lineWidth: 2, dashStyle: 'ShortDash' }
          ],
          legend: { itemStyle: { color: textColor } },
          credits: { enabled: false }
        });
      }).catch(error => console.error("Erreur API", error));
  }, []); 

  // 2. Load Pie Chart
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/repartition-division`)
      .then(response => {
        const data = response.data;
        const textColor = '#9ca3af';

        setPieOptions({
          chart: { type: 'pie', backgroundColor: 'transparent', style: { fontFamily: 'Inter, sans-serif' } },
          title: { text: '' },
          tooltip: { 
            pointFormat: '<b>{point.y:,.2f} MAD</b><br/>({point.percentage:.1f}%)', 
            valueDecimals: 2, 
            backgroundColor: '#0f1524', 
            style: { color: '#ffffff' },
            borderColor: 'rgba(255,255,255,0.1)'
          },
          plotOptions: { 
            pie: { 
              innerSize: '75%', 
              borderWidth: 2, 
              borderColor: '#0f1524', 
              allowPointSelect: true, 
              cursor: 'pointer', 
              dataLabels: { 
                enabled: true, 
                format: '<b>{point.name}</b>', 
                distance: 15, 
                style: { fontWeight: '600', color: textColor, textOutline: 'none' } 
              }, 
              events: { 
                click: function (event) { 
                  const clickedDiv = event.point.name; 
                  setSelectedDivision(prev => prev === clickedDiv ? null : clickedDiv); 
                } 
              } 
            } 
          },
          colors: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'], 
          series: [{ name: 'Chiffre d\'Affaires', colorByPoint: true, data: data.map(item => ({ name: item.division, y: Number(parseFloat(item.ca).toFixed(2)) })) }],
          credits: { enabled: false }
        });
      }).catch(error => console.error("Erreur Pie Chart", error));
  }, []);

  // 3. Load YoY Chart
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/ca-yoy`)
      .then(response => {
        const data = response.data;
        const textColor = '#9ca3af';
        const currentYear = Array(12).fill(0);
        const previousYear = Array(12).fill(0);

        data.forEach(row => {
          const mIndex = row.mois - 1;
          if(mIndex >= 0 && mIndex < 12) {
            currentYear[mIndex] = Number(row.ca_current) || 0;
            previousYear[mIndex] = Number(row.ca_previous) || 0;
          }
        });

        setYoyOptions({
          chart: { type: 'column', backgroundColor: 'transparent', style: { fontFamily: 'Inter, sans-serif' } },
          title: { text: '' },
          xAxis: { 
            categories: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'], 
            labels: { style: { color: textColor } },
            lineColor: 'rgba(255,255,255,0.1)'
          },
          yAxis: { 
            title: { text: '' }, 
            labels: { 
              style: { color: textColor }, 
              formatter: function() { return (this.value / 1000000).toFixed(1) + 'M'; } 
            },
            gridLineColor: 'rgba(255,255,255,0.05)'
          },
          tooltip: { 
            shared: true, 
            valueSuffix: ' MAD', 
            valueDecimals: 2, 
            backgroundColor: '#0f1524', 
            style: { color: '#ffffff' },
            borderColor: 'rgba(255,255,255,0.1)'
          },
          plotOptions: { column: { borderRadius: 6, groupPadding: 0.1 } },
          colors: ['#4b5563', '#ef4444'], 
          series: [
            { name: 'Année Précédente', data: previousYear }, 
            { name: 'Année En Cours', data: currentYear }
          ],
          legend: { itemStyle: { color: textColor } },
          credits: { enabled: false }
        });
      }).catch(err => console.error("Erreur YoY", err));
  }, []);

  // 4. Load BUBBLE Chart
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/bubble-commerciaux`)
      .then(response => {
        const data = response.data;
        const textColor = '#9ca3af';
        
        const bubbleData = data.map(item => ({
            name: item.nom_commercial,
            x: Number(item.ca_realise),
            y: Number(item.ticket_moyen),
            z: Number(item.nb_factures)
        }));

        setBubbleOptions({
            chart: { type: 'bubble', backgroundColor: 'transparent', zoomType: 'xy', style: { fontFamily: 'Inter, sans-serif' } },
            title: { text: '' },
            xAxis: { 
                title: { text: 'CA Total (MAD)', style: { color: textColor, fontWeight: 'bold' } }, 
                labels: { 
                  style: { color: textColor }, 
                  formatter: function() { 
                    let val = this.value;
                    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'; 
                    return val;
                  } 
                },
                gridLineWidth: 1, 
                gridLineColor: 'rgba(255,255,255,0.05)',
                lineColor: 'rgba(255,255,255,0.1)'
            },
            yAxis: { 
                title: { text: 'Panier Moyen', style: { color: textColor, fontWeight: 'bold' } },
                labels: { 
                  style: { color: textColor }, 
                  formatter: function() { return (this.value / 1000).toFixed(0) + 'K'; } 
                },
                gridLineWidth: 1, 
                gridLineColor: 'rgba(255,255,255,0.05)'
            },
            tooltip: {
                useHTML: true,
                backgroundColor: '#0f1524',
                style: { color: '#ffffff' },
                borderColor: 'rgba(255,255,255,0.1)',
                headerFormat: '<table>',
                pointFormat: '<tr><th colspan="2" style="padding-bottom: 5px"><b>{point.name}</b></th></tr>' +
                    '<tr><td style="padding-right: 10px">CA Total:</td><td><b>{point.x:,.2f} MAD</b></td></tr>' +
                    '<tr><td style="padding-right: 10px">Panier Moyen:</td><td><b>{point.y:,.2f} MAD</b></td></tr>' +
                    '<tr><td style="padding-right: 10px">Nb Commandes:</td><td><b>{point.z}</b></td></tr>',
                footerFormat: '</table>'
            },
            plotOptions: {
                bubble: {
                    minSize: 10, maxSize: 30,
                    dataLabels: { 
                      enabled: true, 
                      format: '{point.name}', 
                      style: { color: '#e5e7eb', textOutline: 'none', fontWeight: '600', fontSize: '10px' },
                      allowOverlap: false 
                    }
                }
            },
            series: [{ name: 'Commerciaux', data: bubbleData, colorByPoint: true, marker: { fillOpacity: 0.6, lineWidth: 1, lineColor: '#0f1524' } }],
            legend: { enabled: false },
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
      .then(res => setKpiData(res.data))
      .catch(err => console.error("Erreur KPIs", err));
      
    axios.get(`${import.meta.env.VITE_API_URL}/top-clients${queryString}`)
      .then(res => setTopClients(res.data))
      .catch(err => console.error("Erreur Clients", err));
  }, [selectedDivision, selectedCommercial]); 

  // 6. Load SANKEY Chart
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/sankey-flow`)
      .then(response => {
        const data = response.data; 
        const textColor = '#9ca3af';

        setSankeyOptions({
          chart: { backgroundColor: 'transparent', style: { fontFamily: 'Inter, sans-serif' } },
          title: { text: '' },
          tooltip: {
            backgroundColor: '#0f1524',
            style: { color: '#ffffff' },
            borderColor: 'rgba(255,255,255,0.1)',
            nodeFormat: '{point.name}: <b>{point.sum:,.2f} MAD</b><br/>',
            pointFormat: '{point.fromNode.name} → {point.toNode.name}: <b>{point.weight:,.2f} MAD</b><br/>'
          },
          series: [{
            keys: ['from', 'to', 'weight'],
            data: data,
            type: 'sankey',
            name: 'Flux de Revenus',
            turboThreshold: 0,
            dataLabels: {
              style: { color: textColor, textOutline: 'none', fontSize: '11px', fontWeight: '500' }
            }
          }],
          credits: { enabled: false }
        });
      }).catch(err => console.error("Erreur Sankey", err));
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#050914] text-gray-200 font-sans relative">
      
      {/* BACKGROUND GRID */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* SIDEBAR */}
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative z-10">
        
        {/* TOP HEADER */}
        <header className="flex-shrink-0 bg-[#0f1524]/60 backdrop-blur-2xl border-b border-white/10 px-6 md:px-8 py-4 flex justify-between items-center z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Tableau de Bord</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-gray-400 font-medium hidden sm:inline">Système Actif</span>
          </div>
        </header>

        {/* SCROLLABLE DASHBOARD VIEW */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          
          {/* KPI CARDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            {[
              { title: "CA Global", value: kpiData ? `${kpiData.total_ca} MAD` : "...", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10 border border-emerald-500/20" },
              { title: "Commerciaux", value: kpiData ? kpiData.commerciaux_actifs : "...", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10 border border-blue-500/20" },
              { title: "Obj. Atteint", value: kpiData ? kpiData.objectif_atteint : "...", icon: Target, color: "text-purple-400", bg: "bg-purple-500/10 border border-purple-500/20" },
              { title: "Top Vendeur", value: kpiData ? kpiData.top_vendeur : "...", icon: Award, color: "text-amber-400", bg: "bg-amber-500/10 border border-amber-500/20" },
              { title: "Meilleur Client", value: kpiData ? kpiData.top_client : "...", icon: Briefcase, color: "text-indigo-400", bg: "bg-indigo-500/10 border border-indigo-500/20" },
              { title: "Article Star", value: kpiData ? kpiData.top_article : "...", icon: Package, color: "text-rose-400", bg: "bg-rose-500/10 border border-rose-500/20" },
              { title: "Factures", value: kpiData ? kpiData.nb_factures : "...", icon: FileText, color: "text-cyan-400", bg: "bg-cyan-500/10 border border-cyan-500/20" },
              { title: "Panier Moyen", value: kpiData ? `${kpiData.ticket_moyen} MAD` : "...", icon: ShoppingCart, color: "text-orange-400", bg: "bg-orange-500/10 border border-orange-500/20" },
            ].map((kpi, index) => (
              <div key={index} className="bg-[#0f1524]/70 backdrop-blur-3xl p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-white/10 flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300">
                <div className={`p-3.5 rounded-2xl ${kpi.bg}`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">{kpi.title}</p>
                  <p className="text-lg md:text-xl font-bold text-white tracking-tight">{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* MAIN CHARTS GRID: Bar Chart & Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#0f1524]/70 backdrop-blur-3xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 lg:col-span-2 flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">CA Réalisé vs Objectifs</h3>
                <span className="text-xs text-gray-500">Cliquez sur une barre pour filtrer</span>
              </div>
              <div className="h-80 md:h-96">
                {chartOptions ? <HighchartsReact highcharts={Highcharts} options={chartOptions} containerProps={{ style: { height: '100%' } }} /> : <div className="h-full flex items-center justify-center text-gray-500">Chargement...</div>}
              </div>
            </div>
            
            <div className="bg-[#0f1524]/70 backdrop-blur-3xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 flex flex-col">
              <h3 className="text-lg font-bold text-white tracking-tight mb-4">Répartition par Division</h3>
              <div className="h-80 md:h-96 flex-1">
                {pieOptions ? <HighchartsReact highcharts={Highcharts} options={pieOptions} containerProps={{ style: { height: '100%' } }} /> : <div className="h-full flex items-center justify-center text-gray-500">Chargement...</div>}
              </div>
            </div>
          </div>

          {/* TABLES & LEADERBOARD GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* Top Clients Table */}
            <div className="bg-[#0f1524]/70 backdrop-blur-3xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 lg:col-span-2 flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                <h3 className="text-lg font-bold text-white tracking-tight">Top Clients Récents</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedDivision && <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer" onClick={() => setSelectedDivision(null)}>Div: {selectedDivision} ✕</span>}
                  {selectedCommercial && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer" onClick={() => setSelectedCommercial(null)}>Rep: {selectedCommercial} ✕</span>}
                </div>
              </div>
              <div className="overflow-auto max-h-[380px] pr-2 custom-scrollbar flex-1">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead className="sticky top-0 bg-[#0f1524] z-10">
                    <tr>
                      <th className="pb-4 font-semibold text-xs text-gray-400 border-b border-white/10 w-12 text-center">#</th>
                      <th className="pb-4 font-semibold text-xs text-gray-400 border-b border-white/10 w-1/4">Code</th>
                      <th className="pb-4 font-semibold text-xs text-gray-400 border-b border-white/10 w-1/3">Raison Sociale</th>
                      <th className="pb-4 font-semibold text-xs text-gray-400 border-b border-white/10 text-center">Cmds</th>
                      <th className="pb-4 font-semibold text-xs text-gray-400 border-b border-white/10 text-right">CA</th>
                      <th className="pb-4 font-semibold text-xs text-gray-400 border-b border-white/10 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClients.length > 0 ? (
                      topClients.map((client, index) => (
                        <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 border-b border-white/5 text-xs font-bold text-gray-500 text-center">{index + 1}</td>
                          <td className="py-3.5 border-b border-white/5 text-xs font-medium text-white">{client.code_client}</td>
                          <td className="py-3.5 border-b border-white/5 text-xs text-gray-400 truncate max-w-[150px]">{client.nom_client}</td>
                          <td className="py-3.5 border-b border-white/5 text-xs text-gray-400 text-center">{client.nb_commandes}</td>
                          <td className="py-3.5 border-b border-white/5 text-xs font-bold text-white text-right">{Number(client.ca_total).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MAD</td>
                          <td className="py-3.5 border-b border-white/5 text-center">
                            {Number(client.ca_total) > 1000000 ? <span className="px-2 py-0.5 text-[9px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">VIP</span> : <span className="px-2 py-0.5 text-[9px] font-semibold rounded-full bg-white/5 text-gray-400 border border-white/10 uppercase">Std</span>}
                          </td>
                        </tr>
                      ))
                    ) : (<tr><td colSpan="6" className="py-8 text-center text-gray-500 text-sm">Aucun client trouvé pour cette sélection.</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Leaderboard Card */}
            <div className="bg-[#0f1524]/70 backdrop-blur-3xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white tracking-tight">Leaderboard</h3>
              </div>
              <div className="overflow-auto max-h-[380px] pr-2 custom-scrollbar space-y-4 flex-1">
                {topCommerciaux.slice(0, 7).map((rep, index) => {
                  const progress = rep.objectif_annuel > 0 ? Math.min((rep.ca_realise / rep.objectif_annuel) * 100, 100) : 0;
                  return (
                    <div key={index} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-[10px] ${index === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : index === 1 ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30' : index === 2 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                            #{index + 1}
                          </div>
                          <span className="text-xs font-semibold text-white truncate">{rep.nom_commercial}</span>
                        </div>
                        <div className="flex flex-col text-right flex-shrink-0">
                          <span className="text-xs font-bold text-white">{(rep.ca_realise / 1000000).toFixed(2)}M</span>
                          <span className="text-[9px] text-gray-500">Obj: {(rep.objectif_annuel / 1000000).toFixed(2)}M</span>
                        </div>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-1.5 rounded-full transition-all duration-1000 ease-out ${progress >= 100 ? 'bg-emerald-500' : progress >= 75 ? 'bg-blue-500' : progress >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* BOTTOM CHARTS GRID: YoY and BUBBLE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-[#0f1524]/70 backdrop-blur-3xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10">
              <h3 className="text-lg font-bold text-white tracking-tight mb-4">CA: Année En Cours vs Précédente</h3>
              <div className="h-80 md:h-96">
                {yoyOptions ? <HighchartsReact highcharts={Highcharts} options={yoyOptions} containerProps={{ style: { height: '100%' } }} /> : <div className="h-full flex items-center justify-center text-gray-500">Chargement...</div>}
              </div>
            </div>

            <div className="bg-[#0f1524]/70 backdrop-blur-3xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 flex flex-col">
              <h3 className="text-lg font-bold text-white tracking-tight mb-1">Qualité du Portefeuille</h3>
              <p className="text-xs text-gray-500 mb-4">Taille bulle = Vol. Commandes</p>
              <div className="h-80 md:h-96 flex-1">
                {bubbleOptions ? <HighchartsReact highcharts={Highcharts} options={bubbleOptions} containerProps={{ style: { height: '100%' } }} /> : <div className="h-full flex items-center justify-center text-gray-500">Chargement...</div>}
              </div>
            </div>
          </div>

          {/* BOTTOM FULL-WIDTH: SANKEY FLOW */}
          <div className="bg-[#0f1524]/70 backdrop-blur-3xl p-6 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 mb-8">
            <h3 className="text-lg font-bold text-white tracking-tight mb-1">Flux de Revenus : Division → Commercial → Client</h3>
            <p className="text-xs text-gray-500 mb-6">Épaisseur du flux = Chiffre d'Affaires</p>
            <div className="h-[400px] md:h-[500px]">
              {sankeyOptions ? <HighchartsReact highcharts={Highcharts} options={sankeyOptions} containerProps={{ style: { height: '100%' } }} /> : <div className="h-full flex items-center justify-center text-gray-500">Chargement...</div>}
            </div>
          </div>
          
        </main>
      </div>
    </div>
  );
}
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import * as Highcharts from 'highcharts';
import HighchartsReactWrapper from 'highcharts-react-official';
import { LayoutDashboard, Database, Bot, Settings, LogOut, TrendingUp, Users, Target, Award, Briefcase, Package, FileText, ShoppingCart, Menu, Sun, Moon } from 'lucide-react';

const HighchartsReact = HighchartsReactWrapper.default || HighchartsReactWrapper;

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Nouveaux états pour l'UI
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('pegasus_theme') === 'dark';
  });

  // États existants pour les données
  const [chartOptions, setChartOptions] = useState(null);
  const [kpiData, setKpiData] = useState(null);
  const [pieOptions, setPieOptions] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [topClients, setTopClients] = useState([]);

  // Gestionnaire du Dark Mode sur la balise HTML
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pegasus_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pegasus_theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogout = () => {
    localStorage.removeItem('pegasus_token');
    navigate('/login');
  };

  // Chargement du Bar Chart
  useEffect(() => {
    const token = localStorage.getItem('pegasus_token');
    if (!token) return navigate('/login');

    axios.get(`${import.meta.env.VITE_API_URL}/performances-commerciaux`)
      .then(response => {
        const data = response.data;
        const textColor = isDarkMode ? '#e5e7eb' : '#374151'; // Gris clair vs Gris foncé
        
        setChartOptions({
          chart: { type: 'column', backgroundColor: 'transparent', style: { fontFamily: 'Inter, sans-serif' } },
          title: { text: '' },
          xAxis: { 
            categories: data.map(item => item.nom_commercial), 
            crosshair: true,
            labels: { style: { color: textColor } }
          },
          yAxis: { 
            title: { text: 'Total HT (MAD)', style: { color: textColor } },
            labels: {
              style: { color: textColor },
              formatter: function () {
                if (this.value >= 1000000) return (this.value / 1000000).toFixed(1) + 'M';
                if (this.value >= 1000) return (this.value / 1000).toFixed(1) + 'K';
                return this.value;
              }
            }
          },
          tooltip: { 
            valueSuffix: ' MAD', valueDecimals: 2,
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            style: { color: isDarkMode ? '#ffffff' : '#000000' }
          },
          plotOptions: { column: { borderRadius: 4 } },
          series: [
            { name: 'CA Réalisé', data: data.map(item => Number(item.ca_realise.toFixed(2))), color: '#10b981' },
            { name: 'Objectif à ce jour', data: data.map(item => Number(item.objectif_attendu_a_ce_jour.toFixed(2))), color: '#3b82f6' },
            { type: 'spline', name: 'Objectif Annuel', data: data.map(item => Number(item.objectif_annuel.toFixed(2))), color: '#ef4444', marker: { enabled: false }, lineWidth: 2, dashStyle: 'ShortDash' }
          ],
          legend: { itemStyle: { color: textColor } },
          credits: { enabled: false }
        });
      })
      .catch(error => console.error("Erreur API", error));
  }, [navigate, isDarkMode]); // <-- Relance le graph si on change de thème

  // Chargement du Pie Chart
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/repartition-division`)
      .then(response => {
        const data = response.data;
        const textColor = isDarkMode ? '#e5e7eb' : '#374151';

        setPieOptions({
          chart: { type: 'pie', backgroundColor: 'transparent', style: { fontFamily: 'Inter, sans-serif' } },
          title: { text: '' },
          tooltip: {
            pointFormat: '<b>{point.y:,.2f} MAD</b><br/>({point.percentage:.1f}%)', valueDecimals: 2,
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', style: { color: isDarkMode ? '#ffffff' : '#000000' }
          },
          plotOptions: {
            pie: {
              innerSize: '70%', borderWidth: 4, borderColor: isDarkMode ? '#1f2937' : '#ffffff', allowPointSelect: true, cursor: 'pointer',
              dataLabels: {
                enabled: true, format: '<b>{point.name}</b>', distance: 15,
                style: { fontWeight: '600', color: textColor, textOutline: 'none' }
              },
              events: {
                click: function (event) {
                  const clickedDivision = event.point.name;
                  setSelectedDivision(prev => prev === clickedDivision ? null : clickedDivision);
                }
              }
            }
          },
          colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'], 
          series: [{ name: 'Chiffre d\'Affaires', colorByPoint: true, data: data.map(item => ({ name: item.division, y: Number(parseFloat(item.ca).toFixed(2)) })) }],
          credits: { enabled: false }
        });
      })
      .catch(error => console.error("Erreur Pie Chart", error));
  }, [isDarkMode]);

  // Chargement des KPIs et du Tableau (Écoute le filtre division)
  useEffect(() => {
    const kpiUrl = selectedDivision ? `${import.meta.env.VITE_API_URL}/kpis?division=${selectedDivision}` : `${import.meta.env.VITE_API_URL}/kpis`;
    const clientsUrl = selectedDivision ? `${import.meta.env.VITE_API_URL}/top-clients?division=${selectedDivision}` : `${import.meta.env.VITE_API_URL}/top-clients`;

    axios.get(kpiUrl).then(response => setKpiData(response.data)).catch(error => console.error("Erreur KPIs", error));
    axios.get(clientsUrl).then(response => setTopClients(response.data)).catch(error => console.error("Erreur Clients", error));
  }, [selectedDivision]);

  return (
    // CONTENEUR PARENT SÉCURISÉ (Empêche l'écran de devenir trop large)
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      
      {/* SIDEBAR (Structure Flex solide, largeur à 0 quand fermée) */}
      <aside className={`flex-shrink-0 transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="w-64 h-full flex flex-col justify-between">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-8">Pegasus</h2>
            <nav className="space-y-2">
              <Link to="/" className="flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-medium transition-colors">
                <LayoutDashboard className="h-5 w-5" /> Vue d'ensemble
              </Link>
              <Link to="/datahub" className="flex items-center gap-3 px-4 py-3 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-xl font-medium transition-colors">
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

      {/* COLONNE CENTRALE (Contient la Navbar et le Dashboard) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        
        {/* TOP NAVBAR (Contrôles UI) */}
        <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 py-4 flex justify-between items-center z-10 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tableau de Bord</h1>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </header>

        {/* CONTENU DU DASHBOARD (Zone défilante) */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { title: "CA Global", value: kpiData ? `${kpiData.total_ca} MAD` : "...", icon: TrendingUp, color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
              { title: "Commerciaux", value: kpiData ? kpiData.commerciaux_actifs : "...", icon: Users, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
              { title: "Obj. Atteint", value: kpiData ? kpiData.objectif_atteint : "...", icon: Target, color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/30" },
              { title: "Top Vendeur", value: kpiData ? kpiData.top_vendeur : "...", icon: Award, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30" },
              { title: "Meilleur Client", value: kpiData ? kpiData.top_client : "...", icon: Briefcase, color: "text-indigo-500 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/30" },
              { title: "Article Star", value: kpiData ? kpiData.top_article : "...", icon: Package, color: "text-rose-500 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/30" },
              { title: "Factures", value: kpiData ? kpiData.nb_factures : "...", icon: FileText, color: "text-cyan-500 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-900/30" },
              { title: "Panier Moyen", value: kpiData ? `${kpiData.ticket_moyen} MAD` : "...", icon: ShoppingCart, color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/30" },
            ].map((kpi, index) => (
              <div key={index} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300">
                <div className={`p-4 rounded-2xl ${kpi.bg}`}><kpi.icon className={`h-6 w-6 ${kpi.color}`} /></div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{kpi.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lg:col-span-2 transition-colors duration-300">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">CA Réalisé vs Objectifs</h3>
              <div className="h-96">{chartOptions ? <HighchartsReact highcharts={Highcharts} options={chartOptions} containerProps={{ style: { height: '100%' } }} /> : <div className="h-full flex items-center justify-center text-gray-400">Chargement...</div>}</div>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col transition-colors duration-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Répartition par Division</h3>
                {selectedDivision && <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">Filtre : {selectedDivision}</span>}
              </div>
              <div className="h-96 flex-1">{pieOptions ? <HighchartsReact highcharts={Highcharts} options={pieOptions} containerProps={{ style: { height: '100%' } }} /> : <div className="h-full flex items-center justify-center text-gray-400">Chargement...</div>}</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Clients Récents</h3>
              {selectedDivision && <span className="text-sm text-gray-400 font-medium">Filtré sur : {selectedDivision}</span>}
            </div>
            
           
            
            {/* LE FIX EST ICI : overflow-auto gère le HAUT/BAS et GAUCHE/DROITE, max-h ramène le scroll vertical */}
            <div className="overflow-auto max-h-[400px] pr-2 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                
                {/* z-10 et shadow-sm garantissent que le header passe au-dessus des données au scroll */}
                <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10 shadow-sm">
                  <tr>
                    <th className="pb-4 font-semibold text-sm text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800 w-12 text-center">#</th>
                    <th className="pb-4 font-semibold text-sm text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800 w-1/4">Code Client</th>
                    <th className="pb-4 font-semibold text-sm text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800 w-1/3">Raison Sociale</th>
                    <th className="pb-4 font-semibold text-sm text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800 text-center">Commandes</th>
                    <th className="pb-4 font-semibold text-sm text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800 text-right">Chiffre d'Affaires</th>
                    <th className="pb-4 font-semibold text-sm text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800 text-center">Statut</th>
                  </tr>
                </thead>
                
                <tbody>
                  {topClients.length > 0 ? (
                    topClients.map((client, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                        <td className="py-4 border-b border-gray-50 dark:border-gray-800/50 text-sm font-bold text-gray-400 dark:text-gray-500 text-center">{index + 1}</td>
                        <td className="py-4 border-b border-gray-50 dark:border-gray-800/50 text-sm font-medium text-gray-900 dark:text-white">{client.code_client}</td>
                        <td className="py-4 border-b border-gray-50 dark:border-gray-800/50 text-sm text-gray-600 dark:text-gray-400">{client.nom_client}</td>
                        <td className="py-4 border-b border-gray-50 dark:border-gray-800/50 text-sm text-gray-600 dark:text-gray-400 text-center">{client.nb_commandes}</td>
                        <td className="py-4 border-b border-gray-50 dark:border-gray-800/50 text-sm font-bold text-gray-900 dark:text-white text-right">{Number(client.ca_total).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD</td>
                        <td className="py-4 border-b border-gray-50 dark:border-gray-800/50 text-center">
                          {Number(client.ca_total) > 1000000 ? <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">VIP</span> : <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">Standard</span>}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" className="py-8 text-center text-gray-400 text-sm">Aucun client trouvé.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </main>
      </div>
    </div>
  );
}
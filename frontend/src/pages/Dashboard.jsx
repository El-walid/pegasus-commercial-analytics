import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import * as Highcharts from 'highcharts';
import HighchartsReactWrapper from 'highcharts-react-official';
import { LayoutDashboard, Database, Bot, Settings, LogOut, TrendingUp, Users, Target, Award, Briefcase, Package, FileText, ShoppingCart } from 'lucide-react';

const HighchartsReact = HighchartsReactWrapper.default || HighchartsReactWrapper;

export default function Dashboard() {
  const navigate = useNavigate();
  const [chartOptions, setChartOptions] = useState(null);
  const [kpiData, setKpiData] = useState(null);
  const [pieOptions, setPieOptions] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [topClients, setTopClients] = useState([]);

  // Sécurité : Déconnexion
  const handleLogout = () => {
    localStorage.removeItem('pegasus_token');
    navigate('/login');
  };

  // Chargement des données du graphique principal
  useEffect(() => {
    // Vérification du token (Sécurité)
    const token = localStorage.getItem('pegasus_token');
    if (!token) {
      navigate('/login');
      return;
    }

    axios.get(`${import.meta.env.VITE_API_URL}/performances-commerciaux`)
      .then(response => {
        const data = response.data;
        
        const categories = data.map(item => item.nom_commercial);
        const caRealise = data.map(item => Number(item.ca_realise.toFixed(2)));
        const objectifsAttendu = data.map(item => Number(item.objectif_attendu_a_ce_jour.toFixed(2)));
        const objectifsAnnuel = data.map(item => Number(item.objectif_annuel.toFixed(2)));

        setChartOptions({
          chart: { 
            type: 'column',
            style: { fontFamily: 'Inter, sans-serif' },
            backgroundColor: 'transparent'
          },
          title: { text: '' }, // Titre géré par HTML/Tailwind maintenant
          xAxis: { categories: categories, crosshair: true },
          yAxis: { 
            title: { text: 'Total HT (MAD)' },
            tickInterval: 2500000,
            max: 15000000,
            labels: {
              formatter: function () {
                if (this.value >= 1000000) return (this.value / 1000000).toFixed(1) + 'M';
                if (this.value >= 1000) return (this.value / 1000).toFixed(1) + 'K';
                return this.value;
              }
            }
          },
          tooltip: { valueSuffix: ' MAD', valueDecimals: 2 },
          plotOptions: { column: { borderRadius: 4 } }, // Bords arrondis pour les barres
          series: [
            { name: 'CA Réalisé', data: caRealise, color: '#10b981' }, // Tailwind Emerald 500
            { name: 'Objectif à ce jour', data: objectifsAttendu, color: '#3b82f6' }, // Tailwind Blue 500
            { type: 'spline', name: 'Objectif Annuel', data: objectifsAnnuel, color: '#ef4444', marker: { enabled: false }, lineWidth: 2, dashStyle: 'ShortDash' }
          ],
          credits: { enabled: false } // Cache le logo Highcharts
        });
      })
      .catch(error => console.error("Erreur API", error));
  }, [navigate]);

  useEffect(() => {
  axios.get(`${import.meta.env.VITE_API_URL}/repartition-division`)
    .then(response => {
      const data = response.data;
      
      // Formatage des données pour Highcharts [{ name: 'DElectr', y: 4500000 }]
      const formattedData = data.map(item => ({
        name: item.division,
        y: Number(parseFloat(item.ca).toFixed(2))
      }));

      setPieOptions({
        chart: { 
          type: 'pie', 
          backgroundColor: 'transparent',
          style: { fontFamily: 'Inter, sans-serif' }
        },
        title: { text: '' },
        tooltip: {
          pointFormat: '<b>{point.y:,.2f} MAD</b><br/>({point.percentage:.1f}%)',
          valueDecimals: 2
        },
        plotOptions: {
          pie: {
            innerSize: '70%', // C'est ce qui transforme le Pie Chart en Donut Chart moderne
            borderWidth: 4,   // Espace blanc entre les tranches
            borderColor: '#ffffff',
            allowPointSelect: true,
            cursor: 'pointer',
            dataLabels: {
              enabled: true,
              format: '<b>{point.name}</b>',
              distance: 15, // Éloigne un peu le texte du graphique
              style: { fontWeight: '600', color: '#374151', textOutline: 'none' }
            },
            events: {
              // LA MAGIE POWER BI : Que se passe-t-il au clic ?
              click: function (event) {
                const clickedDivision = event.point.name;
                // Si on reclique sur la même division, ça annule le filtre (comme sur Power BI)
                setSelectedDivision(prev => prev === clickedDivision ? null : clickedDivision);
              }
            }
          }
        },
        // Couleurs premium pour correspondre à l'UI Tailwind
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'], 
        series: [{
          name: 'Chiffre d\'Affaires',
          colorByPoint: true,
          data: formattedData
        }],
        credits: { enabled: false }
      });
    })
    .catch(error => console.error("Erreur Pie Chart", error));
}, []);


// Écouteur de Filtre : Recharge les KPIs quand on clique sur le Pie Chart
  useEffect(() => {
    // Construction de l'URL avec ou sans le filtre division
    const url = selectedDivision 
      ? `${import.meta.env.VITE_API_URL}/kpis?division=${selectedDivision}`
      : `${import.meta.env.VITE_API_URL}/kpis`;

    axios.get(url)
      .then(response => setKpiData(response.data))
      .catch(error => console.error("Erreur chargement KPIs filtrés", error));
      
  }, [selectedDivision]); // <-- React relancera cette fonction à chaque changement de selectedDivision


  // Écouteur de Filtre : Recharge les KPIs ET le Tableau quand on clique sur le Pie Chart
  useEffect(() => {
    const kpiUrl = selectedDivision 
      ? `${import.meta.env.VITE_API_URL}/kpis?division=${selectedDivision}`
      : `${import.meta.env.VITE_API_URL}/kpis`;

    const clientsUrl = selectedDivision 
      ? `${import.meta.env.VITE_API_URL}/top-clients?division=${selectedDivision}`
      : `${import.meta.env.VITE_API_URL}/top-clients`;

    // Appel KPI
    axios.get(kpiUrl)
      .then(response => setKpiData(response.data))
      .catch(error => console.error("Erreur chargement KPIs", error));

    // Appel Top Clients
    axios.get(clientsUrl)
      .then(response => setTopClients(response.data))
      .catch(error => console.error("Erreur chargement Clients", error));
      
  }, [selectedDivision]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      {/* SIDEBAR (Menu de Navigation) */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-8">Pegasus</h2>
          <nav className="space-y-2">
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-gray-100 text-gray-900 rounded-xl font-medium transition-colors">
              <LayoutDashboard className="h-5 w-5" /> Vue d'ensemble
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-xl font-medium transition-colors">
              <Database className="h-5 w-5" /> Hub de Données
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-xl font-medium transition-colors">
              <Bot className="h-5 w-5" /> Assistant IA
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-xl font-medium transition-colors">
              <Settings className="h-5 w-5" /> Paramètres
            </a>
          </nav>
        </div>
        <div className="p-6 border-t border-gray-100">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl font-medium transition-colors">
            <LogOut className="h-5 w-5" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
          <p className="text-gray-500 mt-1">Performances commerciales et analyse des ventes.</p>
        </header>

        {/* LIGNE 1 : KPI Cards (8 Cartes Dynamiques) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: "Chiffre d'Affaires Global", value: kpiData ? `${kpiData.total_ca} MAD` : "...", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50" },
            { title: "Commerciaux Actifs", value: kpiData ? kpiData.commerciaux_actifs : "...", icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
            { title: "Objectif Annuel Atteint", value: kpiData ? kpiData.objectif_atteint : "...", icon: Target, color: "text-purple-500", bg: "bg-purple-50" },
            { title: "Meilleur Vendeur", value: kpiData ? kpiData.top_vendeur : "...", icon: Award, color: "text-amber-500", bg: "bg-amber-50" },
            { title: "Meilleur Client", value: kpiData ? kpiData.top_client : "...", icon: Briefcase, color: "text-indigo-500", bg: "bg-indigo-50" },
            { title: "Article Star (CA)", value: kpiData ? kpiData.top_article : "...", icon: Package, color: "text-rose-500", bg: "bg-rose-50" },
            { title: "Total Factures", value: kpiData ? kpiData.nb_factures : "...", icon: FileText, color: "text-cyan-500", bg: "bg-cyan-50" },
            { title: "Panier Moyen (HT)", value: kpiData ? `${kpiData.ticket_moyen} MAD` : "...", icon: ShoppingCart, color: "text-orange-500", bg: "bg-orange-50" },
          ].map((kpi, index) => (
            <div key={index} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300">
              <div className={`p-4 rounded-2xl ${kpi.bg}`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">{kpi.title}</p>
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* LIGNE 2 : Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Graphique Principal (Prend 2/3 de l'espace) */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-2">
            <h3 className="text-lg font-bold text-gray-900 mb-4">CA Réalisé vs Objectifs</h3>
            <div className="h-96">
              {chartOptions ? (
                <HighchartsReact highcharts={Highcharts} options={chartOptions} containerProps={{ style: { height: '100%' } }} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">Chargement...</div>
              )}
            </div>
          </div>

          {/* Graphique Secondaire (Prend 1/3 de l'espace) */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Répartition par Division</h3>
              
              {/* Badge visuel pour montrer qu'un filtre est actif */}
              {selectedDivision && (
                <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  Filtre : {selectedDivision}
                </span>
              )}
            </div>
            
            <div className="h-96 flex-1">
              {pieOptions ? (
                <HighchartsReact highcharts={Highcharts} options={pieOptions} containerProps={{ style: { height: '100%' } }} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">Chargement...</div>
              )}
            </div>
          </div>
        </div>

        {/* LIGNE 3 : Table de données */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Top Clients Récents</h3>
            {selectedDivision && (
              <span className="text-sm text-gray-400 font-medium">Filtré sur : {selectedDivision}</span>
            )}
          </div>
          
          <div className="overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  {/* NOUVELLE COLONNE : Le Rang */}
                  <th className="pb-4 font-semibold text-sm text-gray-400 border-b border-gray-100 w-12 text-center">#</th>
                  
                  <th className="pb-4 font-semibold text-sm text-gray-400 border-b border-gray-100 w-1/4">Code Client</th>
                  <th className="pb-4 font-semibold text-sm text-gray-400 border-b border-gray-100 w-1/3">Raison Sociale</th>
                  <th className="pb-4 font-semibold text-sm text-gray-400 border-b border-gray-100 text-center">Commandes</th>
                  <th className="pb-4 font-semibold text-sm text-gray-400 border-b border-gray-100 text-right">Chiffre d'Affaires</th>
                  <th className="pb-4 font-semibold text-sm text-gray-400 border-b border-gray-100 text-center">Statut</th>
                </tr>
              </thead>
              
              <tbody>
                {topClients.length > 0 ? (
                  topClients.map((client, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors group">
                      
                      {/* NOUVELLE CELLULE : L'affichage du rang avec (index + 1) */}
                      <td className="py-4 border-b border-gray-50 text-sm font-bold text-gray-400 text-center">
                        {index + 1}
                      </td>

                      <td className="py-4 border-b border-gray-50 text-sm font-medium text-gray-900">
                        {client.code_client}
                      </td>
                      <td className="py-4 border-b border-gray-50 text-sm text-gray-600">
                        {client.nom_client}
                      </td>
                      <td className="py-4 border-b border-gray-50 text-sm text-gray-600 text-center">
                        {client.nb_commandes}
                      </td>
                      <td className="py-4 border-b border-gray-50 text-sm font-bold text-gray-900 text-right">
                        {Number(client.ca_total).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                      </td>
                      <td className="py-4 border-b border-gray-50 text-center">
                        {Number(client.ca_total) > 1000000 ? (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">VIP</span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">Standard</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-400 text-sm">
                      Aucun client trouvé pour cette sélection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </main>
    </div>
  );
}
// client/src/pages/AdminDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { BarChart3, AlertTriangle, Loader2, Zap, Users, AlertCircle, PieChart, Trophy } from 'lucide-react';

// --- Reusable Metric Card Component ---
const MetricCard = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color.bg}`}>
            {React.cloneElement(icon, { className: `w-6 h-6 ${color.text}` })}
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

// --- Feature Adoption Chart Component ---
const FeatureAdoptionChart = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const getEndpointName = (path) => {
        const name = path.split('/').pop().replace('generate-', '').replace('-', ' ');
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-gray-500" /> Generator Popularity
            </h3>
            <div className="space-y-3">
                {data.map((item) => (
                    <div key={item.name}>
                        <div className="flex justify-between text-sm font-medium text-gray-600 mb-1">
                            <span>{getEndpointName(item.name)}</span>
                            <span>{item.count} uses</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className="bg-teal-500 h-2.5 rounded-full"
                                style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Power Users Table Component ---
const PowerUsersTable = ({ data }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" /> Top 5 Users
        </h3>
        <table className="min-w-full">
            <tbody className="divide-y divide-gray-200">
                {data.map((user, index) => (
                    <tr key={user.email}>
                        <td className="py-3 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                                <span className="text-gray-500 font-bold">{index + 1}</span>
                                <div>
                                    <p className="font-semibold text-gray-800">{user.name}</p>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                </div>
                            </div>
                        </td>
                        <td className="py-3 whitespace-nowrap text-right font-bold text-lg text-gray-700">
                            {user.count}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);


export default function AdminDashboardPage() {
    const [logs, setLogs] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch both logs and metrics in parallel for faster loading
                const [logsResponse, metricsResponse] = await Promise.all([
                    api.get('/logs'),
                    api.get('/metrics')
                ]);
                setLogs(logsResponse.data);
                setMetrics(metricsResponse.data);
            } catch {
                setError('Failed to fetch dashboard data. You may not have permission.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const StatusBadge = ({ status }) => {
        let colorClasses = '';
        switch (status) {
            case 'success': colorClasses = 'bg-green-100 text-green-800'; break;
            case 'failure': colorClasses = 'bg-red-100 text-red-800'; break;
            default: colorClasses = 'bg-yellow-100 text-yellow-800';
        }
        return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses}`}>{status}</span>;
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;
    }

    if (error) {
        return (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                <div className="flex"><div className="py-1"><AlertTriangle className="h-5 w-5 text-red-400 mr-3" /></div>
                    <div><p className="font-bold text-red-800">Access Denied</p><p className="text-sm text-red-700">{error}</p></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-teal-600" />
                <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
            </div>

            {/* --- METRICS SECTION --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard title="Total Generator Runs" value={metrics.totalRuns} icon={<Zap />} color={{ bg: 'bg-indigo-100', text: 'text-indigo-600' }} />
                <MetricCard title="Active Users (Top 5)" value={metrics.powerUsers.length} icon={<Users />} color={{ bg: 'bg-sky-100', text: 'text-sky-600' }} />
                <MetricCard title="Error Rate" value={`${metrics.errorRate}%`} icon={<AlertCircle />} color={{ bg: 'bg-red-100', text: 'text-red-600' }} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FeatureAdoptionChart data={metrics.featureAdoption} />
                <PowerUsersTable data={metrics.powerUsers} />
            </div>

            {/* --- LOGS TABLE SECTION --- */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Activity Logs</h2>
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {logs.map((log) => (
                                    <tr key={log._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{log.user?.name || 'N/A'}</div>
                                            <div className="text-sm text-gray-500">{log.user?.email || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{log.apiEndpoint}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={log.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
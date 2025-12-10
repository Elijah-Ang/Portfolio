// Simple CSV parser for small client-side uploads
function parseCsv(text, delimiter = ',') {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(delimiter).map((h) => h.trim());
  return lines.map((line) => {
    const cells = line.split(delimiter);
    return headers.reduce((row, header, index) => {
      row[header] = cells[index] ? cells[index].trim() : '';
      return row;
    }, {});
  });
}

// Demo data to keep the layout working without uploads
const fallbackData = [
  { Date: '2023-01-02', Hedge: 'Dynamic', Return: 0.002, Beta: 1.2, Correlation: 0.8, Equity: 100 },
  { Date: '2023-01-03', Hedge: 'Static', Return: -0.001, Beta: 0.9, Correlation: 0.82, Equity: 101 },
  { Date: '2023-01-04', Hedge: 'Unhedged', Return: 0.004, Beta: 1.4, Correlation: 0.78, Equity: 103 },
  { Date: '2023-02-02', Hedge: 'Dynamic', Return: 0.005, Beta: 0.8, Correlation: 0.76, Equity: 104 },
  { Date: '2023-02-03', Hedge: 'Static', Return: 0.002, Beta: 1.1, Correlation: 0.74, Equity: 106 },
  { Date: '2023-03-03', Hedge: 'Unhedged', Return: -0.003, Beta: 1.3, Correlation: 0.7, Equity: 105 },
  { Date: '2023-03-04', Hedge: 'Dynamic', Return: 0.006, Beta: 0.7, Correlation: 0.68, Equity: 108 },
  { Date: '2023-04-05', Hedge: 'Static', Return: -0.002, Beta: 1.05, Correlation: 0.69, Equity: 107 },
  { Date: '2023-04-06', Hedge: 'Unhedged', Return: 0.003, Beta: 1.2, Correlation: 0.67, Equity: 109 },
];

const colorPalette = ['#1e88e5', '#f27f3d', '#43a047', '#8e24aa', '#3949ab', '#00897b'];

const charts = {};

function groupBy(array, key) {
  return array.reduce((acc, item) => {
    const group = item[key];
    acc[group] = acc[group] || [];
    acc[group].push(item);
    return acc;
  }, {});
}

function monthName(date) {
  return new Intl.DateTimeFormat('en', { month: 'short' }).format(date);
}

function calcMonthlyGrid(data) {
  const grouped = groupBy(data, 'Hedge');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const datasets = Object.entries(grouped).map(([hedge, rows], index) => {
    const monthValues = months.map((m, i) => {
      const filtered = rows.filter((row) => new Date(row.Date).getMonth() === i);
      const avg = filtered.reduce((sum, r) => sum + Number(r.Return || 0), 0) / (filtered.length || 1);
      return Math.round(avg * 10000) / 100; // percentage
    });
    return {
      label: hedge,
      data: monthValues,
      backgroundColor: colorPalette[index % colorPalette.length],
    };
  });
  return { months, datasets };
}

function calcHistogram(data) {
  const bins = Array(11).fill(0);
  data.forEach((row) => {
    const value = Number(row.Return || 0);
    const bucket = Math.max(0, Math.min(10, Math.floor((value + 0.05) * 10)));
    bins[bucket] += 1;
  });
  const labels = bins.map((_, idx) => `${(idx / 10 - 0.05).toFixed(2)}`);
  return { labels, bins };
}

function calcRollingCorrelation(data) {
  const sorted = [...data].sort((a, b) => new Date(a.Date) - new Date(b.Date));
  const window = 5; // shorter window for demo
  const labels = [];
  const values = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i + 1 < window) continue;
    const slice = sorted.slice(i - window + 1, i + 1);
    const avg = slice.reduce((sum, row) => sum + Number(row.Correlation || 0), 0) / slice.length;
    labels.push(sorted[i].Date);
    values.push(Math.round(avg * 100) / 100);
  }
  return { labels, values };
}

function calcEquityCurves(data) {
  const grouped = groupBy(data, 'Hedge');
  return Object.entries(grouped).map(([hedge, rows], index) => {
    const sorted = rows.sort((a, b) => new Date(a.Date) - new Date(b.Date));
    const labels = sorted.map((row) => row.Date);
    const equity = sorted.reduce((acc, row, idx) => {
      const prev = idx === 0 ? 100 : acc[idx - 1];
      acc.push(prev * (1 + Number(row.Return || 0)));
      return acc;
    }, []);
    return {
      label: hedge,
      data: equity.map((v) => Math.round(v * 100) / 100),
      labels,
      borderColor: colorPalette[index % colorPalette.length],
      tension: 0.2,
      fill: false,
    };
  });
}

function calcBeta(data) {
  const labels = data.map((d) => d.Date);
  const values = data.map((d) => Number(d.Beta || 0));
  return { labels, values };
}

function calcKpis(data) {
  const grouped = groupBy(data, 'Hedge');
  return Object.entries(grouped).map(([hedge, rows]) => {
    const returns = rows.map((r) => Number(r.Return || 0));
    const avg = returns.reduce((sum, r) => sum + r, 0) / (returns.length || 1);
    const vol = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / (returns.length || 1));
    const maxDrawdown = Math.min(...rows.map((r) => Number(r.Return || 0)));
    return {
      hedge,
      cagr: (avg * 252).toFixed(2),
      vol: (vol * Math.sqrt(252)).toFixed(2),
      maxDrawdown: (maxDrawdown * 100).toFixed(2),
    };
  });
}

function calcSensitivity(data) {
  const grouped = groupBy(data, 'Hedge');
  return Object.entries(grouped).map(([hedge, rows], index) => {
    const sorted = rows.sort((a, b) => new Date(a.Date) - new Date(b.Date));
    const labels = sorted.map((row) => row.Date);
    const values = sorted.map((row) => Number(row.Equity || 100));
    return {
      label: hedge,
      data: values,
      labels,
      borderColor: colorPalette[index % colorPalette.length],
      tension: 0.1,
      fill: false,
    };
  });
}

function calcStressCurves(data, labelSuffix) {
  const grouped = groupBy(data, 'Hedge');
  return Object.entries(grouped).map(([hedge, rows], index) => {
    const sorted = rows.sort((a, b) => new Date(a.Date) - new Date(b.Date));
    return {
      label: `${hedge} ${labelSuffix}`.trim(),
      data: sorted.map((row) => Number(row.Equity || 100)),
      labels: sorted.map((row) => row.Date),
      borderColor: colorPalette[index % colorPalette.length],
      tension: 0,
      fill: false,
    };
  });
}

function calcDrawdown(data) {
  const labels = data.map((row) => row.Date);
  const value = data.map((row) => Number(row.Return || 0));
  return { labels, value };
}

function renderHeatmap(months, datasets) {
  const ctx = document.getElementById('heatmap');
  charts.heatmap?.destroy();
  charts.heatmap = new Chart(ctx, {
    type: 'bar',
    data: { labels: months, datasets },
    options: {
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { ticks: { callback: (v) => `${v}%` }, title: { display: true, text: 'Avg monthly return (%)' } } },
    },
  });
}

function renderBoxplot(months, datasets) {
  const ctx = document.getElementById('boxplot');
  charts.boxplot?.destroy();
  charts.boxplot = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: datasets.map((ds, index) => ({
        label: ds.label,
        data: ds.data,
        borderColor: colorPalette[index % colorPalette.length],
        backgroundColor: colorPalette[index % colorPalette.length],
        fill: false,
        tension: 0.1,
      })),
    },
    options: { plugins: { legend: { position: 'bottom' } } },
  });
}

function renderHistogram(labels, bins) {
  const ctx = document.getElementById('histogram');
  charts.histogram?.destroy();
  charts.histogram = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Frequency', data: bins, backgroundColor: colorPalette[0] }] },
    options: { scales: { x: { title: { display: true, text: 'Return bucket' } }, y: { title: { display: true, text: 'Count' } } } },
  });
}

function renderCorrelation(labels, values) {
  const ctx = document.getElementById('correlation');
  charts.correlation?.destroy();
  charts.correlation = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Rolling correlation', data: values, borderColor: colorPalette[1], tension: 0.2 }] },
    options: { scales: { y: { min: 0, max: 1 } } },
  });
}

function renderEquity(curves) {
  const ctx = document.getElementById('equity');
  charts.equity?.destroy();
  charts.equity = new Chart(ctx, {
    type: 'line',
    data: {
      labels: curves[0]?.labels || [],
      datasets: curves.map((curve) => ({ ...curve, data: curve.data, labels: undefined })),
    },
    options: { plugins: { legend: { position: 'bottom' } } },
  });
}

function renderBeta(labels, values) {
  const ctx = document.getElementById('beta');
  charts.beta?.destroy();
  charts.beta = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Rolling Beta', data: values, borderColor: colorPalette[2], fill: false, tension: 0.15 }] },
    options: { scales: { y: { title: { display: true, text: 'Beta' } } } },
  });
}

function renderStaticDynamic(curves) {
  const ctx = document.getElementById('static-dynamic-chart');
  charts.staticDynamic?.destroy();
  charts.staticDynamic = new Chart(ctx, {
    type: 'line',
    data: { labels: curves[0]?.labels || [], datasets: curves.map((curve) => ({ ...curve, labels: undefined })) },
    options: { plugins: { legend: { position: 'bottom' } } },
  });
}

function renderKpis(kpis) {
  const grid = document.getElementById('kpi-grid');
  grid.innerHTML = '';
  kpis.forEach((kpi) => {
    const card = document.createElement('div');
    card.className = 'kpi-card';
    card.innerHTML = `
      <h4>${kpi.hedge}</h4>
      <p><strong>CAGR:</strong> ${kpi.cagr}%</p>
      <p><strong>Volatility:</strong> ${kpi.vol}%</p>
      <p><strong>Max DD:</strong> ${kpi.maxDrawdown}%</p>
    `;
    grid.appendChild(card);
  });
}

function renderSensitivity(curves) {
  const ctx = document.getElementById('sensitivity-chart');
  charts.sensitivity?.destroy();
  charts.sensitivity = new Chart(ctx, {
    type: 'line',
    data: { labels: curves[0]?.labels || [], datasets: curves.map((curve) => ({ ...curve, labels: undefined })) },
    options: { plugins: { legend: { position: 'bottom' } }, scales: { y: { title: { display: true, text: 'Equity' } } } },
  });
}

function renderStress(curves, canvasId) {
  const ctx = document.getElementById(canvasId);
  charts[canvasId]?.destroy();
  charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels: curves[0]?.labels || [], datasets: curves.map((curve) => ({ ...curve, labels: undefined })) },
    options: { plugins: { legend: { position: 'bottom' } }, scales: { y: { title: { display: true, text: 'Index level' } } } },
  });
}

function renderDrawdown(labels, value) {
  const ctx = document.getElementById('drawdown');
  charts.drawdown?.destroy();
  charts.drawdown = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Drawdown', data: value, borderColor: colorPalette[3], fill: false }] },
    options: { plugins: { legend: { position: 'bottom' } }, scales: { y: { title: { display: true, text: 'Return' } } } },
  });
}

function renderStory(data) {
  const monthly = calcMonthlyGrid(data);
  renderHeatmap(monthly.months, monthly.datasets);
  renderBoxplot(monthly.months, monthly.datasets);

  const histogram = calcHistogram(data);
  renderHistogram(histogram.labels, histogram.bins);

  const corr = calcRollingCorrelation(data);
  renderCorrelation(corr.labels, corr.values);

  const equityCurves = calcEquityCurves(data);
  renderEquity(equityCurves);

  const beta = calcBeta(data);
  renderBeta(beta.labels, beta.values);

  renderStaticDynamic(equityCurves);
  renderKpis(calcKpis(data));

  renderSensitivity(calcSensitivity(data));

  renderStress(calcStressCurves(data, 'A'), 'stress-a');
  renderStress(calcStressCurves(data, 'B'), 'stress-b');

  const drawdown = calcDrawdown(data);
  renderDrawdown(drawdown.labels, drawdown.value);
}

function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target?.result;
    if (typeof text !== 'string') return;
    const delimiter = file.name.endsWith('.tsv') ? '\t' : ',';
    const parsed = parseCsv(text, delimiter).map((row) => ({
      ...row,
      Return: Number(row.Return),
      Beta: Number(row.Beta),
      Correlation: Number(row.Correlation),
      Equity: Number(row.Equity),
    }));
    renderStory(parsed);
  };
  reader.readAsText(file);
}

function bootstrap() {
  const input = document.getElementById('data-file');
  input.addEventListener('change', handleFileUpload);
  renderStory(fallbackData);
}

document.addEventListener('DOMContentLoaded', bootstrap);

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const ChartHelper = {
  getColor(categories, name) {
    const cat = categories.find(c => c.name === name);
    return cat ? cat.color : '#C9CBCF';
  },

  drawPie(el, categoryTotals, categories, selectedCategory, charts) {
    if (!el || typeof google === 'undefined' || !google.visualization) return;
    const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return;
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Categoria');
    data.addColumn('number', 'Valor');
    const colors = [];
    for (const [cat] of entries) {
      data.addRow([cat, categoryTotals[cat]]);
      colors.push(this.getColor(categories, cat));
    }
    const opts = {
      pieHole: 0.4, colors, pieSliceText: 'percentage',
      legend: { position: 'right', alignment: 'center' },
      chartArea: { left: 20, top: 20, width: '70%', height: '85%' }, fontSize: 12,
      animation: { duration: 600, easing: 'out' },
    };
    if (selectedCategory) {
      const slices = {};
      entries.forEach(([cat], i) => { if (cat === selectedCategory) slices[i] = { offset: 0.08 }; });
      opts.slices = slices;
    }
    if (!charts.pie) charts.pie = new google.visualization.PieChart(el);
    charts.pie.draw(data, opts);
  },

  drawMonthly(el, monthTotals, categories, charts) {
    if (!el || typeof google === 'undefined' || !google.visualization) return;
    if (!monthTotals.length) return;
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Mês');
    data.addColumn('number', 'Total');
    data.addColumn({ type: 'string', role: 'style' });
    for (const m of monthTotals) {
      data.addRow([m.label, m.total, this.getColor(categories, m.topCategory)]);
    }
    const opts = {
      legend: { position: 'none' }, bar: { groupWidth: '60%' },
      vAxis: { format: 'R$ #,##0', minValue: 0 },
      chartArea: { left: 60, top: 10, width: '85%', height: '80%' }, fontSize: 12,
      animation: { duration: 500, easing: 'out' },
    };
    if (!charts.monthly) charts.monthly = new google.visualization.ColumnChart(el);
    charts.monthly.draw(data, opts);
  },

  drawTop5(el, top5, categories, charts) {
    if (!el || typeof google === 'undefined' || !google.visualization) return;
    if (!top5.length) return;
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Descrição');
    data.addColumn('number', 'Valor');
    data.addColumn({ type: 'string', role: 'style' });
    for (const tx of [...top5].reverse()) {
      const label = tx.description.length > 18 ? tx.description.substring(0, 16) + '...' : tx.description;
      data.addRow([label, tx.amount, this.getColor(categories, tx.category)]);
    }
    const opts = {
      legend: { position: 'none' }, bar: { groupWidth: '60%' },
      hAxis: { format: 'R$ #,##0', minValue: 0 },
      chartArea: { left: 120, top: 10, width: '70%', height: '80%' }, fontSize: 11,
      animation: { duration: 500, easing: 'out' },
    };
    if (!charts.top5) charts.top5 = new google.visualization.BarChart(el);
    charts.top5.draw(data, opts);
  },

  drawDaily(el, dailyTotals, charts) {
    if (!el || typeof google === 'undefined' || !google.visualization) return;
    if (!dailyTotals.length) return;
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Dia');
    data.addColumn('number', 'Gasto');
    data.addColumn({ type: 'string', role: 'style' });
    for (const [date, total] of dailyTotals) {
      const d = new Date(date + 'T12:00:00');
      data.addRow([d.getDate() + '/' + (d.getMonth() + 1), total, '#0d6efd']);
    }
    const opts = {
      legend: { position: 'none' }, bar: { groupWidth: '70%' },
      vAxis: { format: 'R$ #,##0', minValue: 0 },
      chartArea: { left: 60, top: 10, width: '90%', height: '80%' }, fontSize: 11,
      animation: { duration: 500, easing: 'out' },
    };
    if (!charts.daily) charts.daily = new google.visualization.ColumnChart(el);
    charts.daily.draw(data, opts);
  },
};

// Chart config
Chart.defaults.global.elements.line.borderWidth = 1

const ORANGE = 'rgba(201, 78, 21, 0.5)'
const RED = 'rgba(209, 29, 29, 0.5)'
const BLUE = 'rgba(29, 128, 209, 0.5)'
const GREEN = 'rgba(116, 209, 29, 0.5)'
const YELLOW = 'rgba(209, 182, 29, 0.5)'
const PURPLE = 'rgba(136, 26, 209, 0.5)'

const ORANGE_BORDER = 'rgba(201, 78, 21, 1.0)'
const RED_BORDER = 'rgba(209, 29, 29, 1.0)'
const BLUE_BORDER = 'rgba(29, 128, 209, 1.0)'
const GREEN_BORDER = 'rgba(116, 209, 29, 1.0)'
const YELLOW_BORDER = 'rgba(209, 182, 29, 1.0)'
const PURPLE_BORDER = 'rgba(136, 26, 209, 1.0)'

const OPTIONS = {
    responsive: false,
    animation: false,
    scales: {
        xAxes: [{
            ticks: {
                autoSkip: true,
                maxTicksLimit: 10
            },
            gridLines: {
                display: false,
            },
        }],
        yAxes: [{
            gridLines: {
                display: true,
                color: '#2a2a2a'
            },
            ticks: {
                autoSkip: true,
                maxTicksLimit: 10
            }
        }]
    }
}

const setElementContent = (id, value) => {
    document.getElementById(id).innerHTML = value
}

const setStatus = ok => {
    const title = document.getElementById('title')
    if (!ok) {
        title.style.color = 'red';
    } else {
        title.style.color = 'unset';
    }
}

const getLastNumDays = (data, days) => {
    size = data.length

    return data.slice(Math.max(size - days, 0), size)
}

const getLast = data => {
    if (data.length > 0) {
        return data[data.length - 1]
    } else {
        return null
    }
}

const getPaddingFrom = data => {
    return data.slice(0, data.length - 1).map(d => null)
}

const logTickBuilder = chartObj => {
    const ticks = [1, 10, 100, 1000, 10000];
    chartObj.ticks.splice(0, chartObj.ticks.length);
    chartObj.ticks.push(...ticks)
}

const logTickMapper = (value, index, values) => {
    if (value === 1000000) return "1M"
    if (value === 100000) return "100K"
    if (value === 10000) return "10K"
    if (value === 1000) return "1K"
    if (value === 100) return "100"
    if (value === 10) return "10"
    if (value === 0) return "0"
    return null;
}

const initChart = (opts, datasets, labels) => {
    const ctx = document.getElementById(opts.element).getContext('2d')
    const type = opts.type || 'bar'

    // Hacky deep copy
    const globalOpts = JSON.parse(JSON.stringify(OPTIONS))

    if (opts.logX) {
        globalOpts.scales.xAxes[0].type = 'logarithmic'
        globalOpts.scales.xAxes[0].afterBuildTicks = logTickBuilder
        globalOpts.scales.xAxes[0].ticks.callback = logTickMapper
    }
    if (opts.logY) {
        globalOpts.scales.yAxes[0].type = 'logarithmic'
        globalOpts.scales.yAxes[0].afterBuildTicks = logTickBuilder
        globalOpts.scales.yAxes[0].ticks.callback = logTickMapper
    }

    if (opts.labelX) {
        globalOpts.scales.xAxes[0].scaleLabel.display = true
        globalOpts.scales.xAxes[0].scaleLabel.display = opts.labelX
        
    }
    if (opts.labelY) {
        globalOpts.scales.yAxes[0].scaleLabel.display = true
        globalOpts.scales.yAxes[0].scaleLabel.labelString = opts.labelY
    }

    if (opts.title) globalOpts.title = {
        display: true,
        text: opts.title
    }

    return new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: datasets
        },
        options: globalOpts
    })
}

const updateCounters = c => {
    setElementContent('counter-infected', c['infected']['total'])
    setElementContent('counter-infected-today', c['infected']['today'])
    setElementContent('counter-infected-change-percent', `${c['infected']['change_percent']} %`)
    setElementContent('counter-dead', c['dead']['total'])
    setElementContent('counter-dead-today', c['dead']['today'])
    setElementContent('counter-tested', c['tested']['total'])
    setElementContent('counter-population', c['population']['total'])
    setElementContent('counter-hospitalized', c['hospitalized']['general']['total'])
    setElementContent('counter-hospitalized-doubling-rate', `${c['hospitalized']['general']['doubling_rate']} days`)
    setElementContent('counter-hospitalized-critical', c['hospitalized']['critical']['total'])
    setElementContent('counter-hospital-staff-infected', c['hospital_staff']['infected']['total'])
    setElementContent('counter-hospital-staff-quarantined', c['hospital_staff']['quarantined']['total'])
    setElementContent('counter-cases-in-population', `${c['population']['infected_percent']} %`)
    setElementContent('counter-tested-in-population', `${c['population']['tested_percent']} %`)
    setElementContent('counter-mortality-rate', `${c['dead']['mortality_percent']} %`)
    setElementContent('counter-tested-hit-ratio', `${c['tested']['hit_ratio_percent']} %`)
    setElementContent('counter-infected-doubling-rate', `${c['infected']['doubling_rate']} days`)
    setElementContent('counter-infected-doubling-rate-ma3', `${c['infected']['doubling_rate_from_mov_avg_3']} days`)
}

const bindDatePicker = (data, charts) => {
    const slider = document.getElementById('datepicker')

    const updateDate = i => {
        setElementContent('counter-date', data[i]['date'])
    }

    updateDate(data.length - 1)

    slider.setAttribute('max', `${data.length - 1}`)
    slider.setAttribute('value', `${data.length - 1}`)

    slider.oninput = function() {
        const i = parseInt(this.value)

        updateDate(i)
        updateCounters(data[i])

        const newData = data.slice(0, i + 1)

        for (let chart of charts) {
            chart.update(newData)
        }
    }
}

const updateCurrent = data => {
    setStatus(data['status'] === 'ok')

    const c = data['current']

    setElementContent('last-update', `Updated ${data['updated']}`)

    updateCounters(c)
}

const createChart = (originalData, opts) => {
    const prepareData = data => {
        const windowSize = opts.window || null
        const filter = opts.filter || null

        let filteredData = data

        if (windowSize !== null) filteredData = getLastNumDays(filteredData, windowSize)
        if (filter !== null) filteredData = filteredData.filter(opts.filter)

        return filteredData
    }

    const getLabels = ldata => {
        if (opts.labelGetter) return ldata.map(opts.labelGetter)
        else return ldata.map(d => d['date'].slice(5, 10))
    }

    const data = prepareData(originalData)
    const labels = getLabels(data)

    const chart = initChart(
        {
            element: opts.element,
            title: opts.title,
            type: opts.type,
            logX: opts.logX,
            logY: opts.logY
        },
        opts.datasets.map(d => {
            return {
                ...d,
                data: data.map(d.valueGetter)
            }
        }),
        labels
    )

    return {
        chart: chart,
        update: d => {
            const newData = prepareData(d)

            for (let i = 0; i < opts.datasets.length; i++) {
                chart.data.datasets[i].data = newData.map(opts.datasets[i].valueGetter)
            }

            chart.data.labels = getLabels(newData)

            chart.update()
        }
    }
}

const createAllCharts = data => {
    const charts = []

    charts.push(createChart(
        data,
        {
            element: 'infected',
            datasets: [{
                label: 'Total Infected',
                valueGetter: d => d['infected']['total'],
                borderColor: YELLOW_BORDER,
                backgroundColor: YELLOW,
            }]
        },
    ))

    charts.push(createChart(
        data,
        {
            element: 'infectedToday',
            datasets: [{
                label: 'Daily Infected',
                valueGetter: d => d['infected']['today'],
                borderColor: BLUE_BORDER,
                backgroundColor: BLUE,
            }]
        },
    ))

    charts.push(createChart(
        data,
        {
            element: 'dead',
            datasets: [{
                label: 'Total Deaths',
                valueGetter: d => d['dead']['total'],
                borderColor: RED_BORDER,
                backgroundColor: RED,
            }]
        },
    ))

    charts.push(createChart(
        data,
        {
            element: 'deadToday',
            datasets: [{
                label: 'Daily Deaths',
                valueGetter: d => d['dead']['today'],
                borderColor: RED_BORDER,
                backgroundColor: RED,
            }]
        },
    ))

    charts.push(createChart(
        data,
        {
            element: 'hospitalized',
            title: 'Hospitalized',
            filter: d => d['hospitalized']['general']['total'] > 0,
            datasets: [{
                label: 'Critical',
                valueGetter: d => d['hospitalized']['critical']['total'],
                borderColor: ORANGE_BORDER,
                backgroundColor: 'rgba(201, 78, 21, 0.5)',
            },
            {
                label: 'Total',
                valueGetter: d => d['hospitalized']['general']['total'],
                borderColor: PURPLE_BORDER,
                backgroundColor: PURPLE,
            }]
        },
    ))

    charts.push(createChart(
        data,
        {
            element: 'hospitalStaffInfected',
            filter: d => d['hospital_staff']['infected']['total'] > 0,
            datasets: [{
                label: 'Hospital Staff Infected',
                valueGetter: d => d['hospital_staff']['infected']['total'],
                borderColor: YELLOW_BORDER,
                backgroundColor: YELLOW,
            }]
        },
    ))

    charts.push(createChart(
        data,
        {
            element: 'hospitalStaffQuarantined',
            filter: d => d['hospital_staff']['quarantined']['total'] > 0,
            datasets: [{
                label: 'Hospital Staff Quarantined',
                valueGetter: d => d['hospital_staff']['quarantined']['total'],
                borderColor: BLUE_BORDER,
                backgroundColor: BLUE,
            }]
        }
    ))

    charts.push(createChart(
        data,
        {
            element: 'tested',
            filter: d => d['tested']['total'] > 0,
            datasets: [{
                label: 'Tested',
                valueGetter: d => d['tested']['total'],
                borderColor: GREEN_BORDER,
                backgroundColor: GREEN,
            }]
        },
    ))

    // Growth factors

    charts.push(createChart(
        data,
        {
            element: 'infectedMA',
            title: 'Daily New Infections (Moving Average)',
            type: 'line',
            datasets: [{
                label: '3 day window',
                valueGetter: d => d['infected']['today_mov_avg_3'],
                borderColor: ORANGE_BORDER,
                backgroundColor: ORANGE,
            },
            {
                label: '5 day window',
                valueGetter: d => d['infected']['today_mov_avg_5'],
                borderColor: YELLOW_BORDER,
                backgroundColor: YELLOW,
            }]
        }
    ))

    charts.push(createChart(
        data,
        {
            element: 'infectedVsDailyInfected',
            title: 'Daily Infected vs Total Infected (Exponential growth measure)',
            type: 'line',
            logX: true,
            logY: true,
            labelGetter: d => d['infected']['total'],
            datasets: [{
                label: 'Daily Infections (3 day moving average)',
                valueGetter: d => { return { x: d['infected']['total'], y: d['infected']['today_mov_avg_3'] } },
                lineTension: 0.2,
                fill: false,
                borderColor: ORANGE_BORDER,
                backgroundColor: ORANGE,
            }]
        }
    ))

    charts.push(createChart(
        data,
        {
            element: 'infectedDoublingRate',
            title: 'Infection Doubling Rate',
            datasets: [{
                label: 'Standard (days)',
                valueGetter: d => d['infected']['doubling_rate'],
                borderColor: ORANGE_BORDER,
                backgroundColor: ORANGE,
            },
            {
                label: '3 Day Moving Average (days)',
                valueGetter: d => d['infected']['doubling_rate_from_mov_avg_3'],
                borderColor: YELLOW_BORDER,
                backgroundColor: YELLOW,
            }]
        }
    ))

    charts.push(createChart(
        data,
        {
            element: 'infectedChange',
            title: 'Infections Day-To-Day Change (Last 14 days)',
            window: 14,
            datasets: [{
                label: 'Daily Infected',
                valueGetter: d => d['infected']['daily_diff'],
                borderColor: YELLOW_BORDER,
                backgroundColor: YELLOW,
            }]
        }
    ))

    charts.push(createChart(
        data,
        {
            element: 'testedChange',
            title: 'Testing Day-to-Day Change (Last 14 days)',
            window: 14,
            datasets: [{
                label: 'Daily Tested',
                valueGetter: d => d['tested']['daily_diff'],
                borderColor: GREEN_BORDER,
                backgroundColor: GREEN,
            }]
        }
    ))

    charts.push(createChart(
        data,
        {
            element: 'testedHitRatioPercent',
            title: 'Test Hit Ratio',
            filter: d => d['tested']['total'] > 0,
            datasets: [{
                label: 'Hit Ratio (%)',
                valueGetter: d => d['tested']['hit_ratio_percent'],
                borderColor: GREEN_BORDER,
                backgroundColor: GREEN,
            }]
        },
    ))

    charts.push(createChart(
        data,
        {
            element: 'hospitalizedChange',
            title: 'Daily Hospitalizations',
            filter: d => d['hospitalized']['general']['total'] > 0,
            datasets: [{
                label: 'General',
                valueGetter: d => d['hospitalized']['general']['today'],
                borderColor: PURPLE_BORDER,
                backgroundColor: PURPLE,
            },
            {
                label: 'Critical',
                valueGetter: d => d['hospitalized']['critical']['today'],
                borderColor: ORANGE_BORDER,
                backgroundColor: 'rgba(201, 78, 21, 0.5)',
            }]
        }
    ))

    charts.push(createChart(
        data,
        {
            element: 'hospitalizedMA',
            title: 'Daily Hospitalization Moving Average',
            filter: d => d['hospitalized']['general']['total'] > 0,
            type: 'line',
            datasets: [{
                label: 'General (3 day window)',
                valueGetter: d => d['hospitalized']['general']['today_mov_avg_3'],
                borderColor: PURPLE_BORDER,
                backgroundColor: PURPLE,
            },
            {
                label: 'Critical (3 day window)',
                valueGetter: d => d['hospitalized']['critical']['today_mov_avg_3'],
                borderColor: ORANGE_BORDER,
                backgroundColor: 'rgba(201, 78, 21, 0.5)',
            }]
        }
    ))

    charts.push(createChart(
        data,
        {
            element: 'hospitalizedDoublingRate',
            title: 'Hospitalization Doubling Rate (Last 14 days)',
            window: 14,
            datasets: [{
                label: 'Doubling Rate (days)',
                valueGetter: d => d['hospitalized']['general']['doubling_rate'],
                borderColor: PURPLE_BORDER,
                backgroundColor: PURPLE,
            }]
        }
    ))

    charts.push(createChart(
        data,
        {
            element: 'hospitalStaffInfectedChange',
            title: 'Hospital Staff Infected Day-by-Day Change',
            filter: d => d['hospital_staff']['infected']['total'] > 0,
            datasets: [{
                label: 'Daily Change',
                valueGetter: d => d['hospital_staff']['infected']['daily_diff'],
                borderColor: BLUE_BORDER,
                backgroundColor: BLUE,
            }]
        }
    ))

    charts.push(createChart(
        data,
        {
            element: 'hospitalStaffInfectedDoublingRate',
            title: 'Hospital Staff Infected Doubling Rate (Last 14 days)',
            window: 14,
            datasets: [{
                label: 'Doubling Rate (days)',
                valueGetter: d => d['hospital_staff']['infected']['doubling_rate'],
                borderColor: YELLOW_BORDER,
                backgroundColor: YELLOW,
            }]
        },
    ))

    return charts
}

const loadData = async() => {
    fetch('/api').then(async r => {
        const data = await r.json()
        const charts = createAllCharts(data['history'])
        updateCurrent(data)
        bindDatePicker(data['history'], charts)
        const lab = new SimulationLab(150)
    })
}

document.addEventListener("DOMContentLoaded", loadData)

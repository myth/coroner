// Chart config
Chart.defaults.global.elements.point.radius = 3
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

const LINE_TENSION = 0

const OPTIONS = {
    responsive: false,
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

const initChart = (opts, datasets, labels) => {
    const ctx = document.getElementById(opts.element).getContext('2d')
    const type = opts.type || 'bar'
    const stacked = opts.stacked || false

    const globalOpts = {...OPTIONS}

    if (opts.log) globalOpts.scales.yAxes[0].type = 'logarithmic'
    if (opts.stacked) {
        globalOpts.scales.xAxes[0].stacked = stacked
        globalOpts.scales.yAxes[0].stacked = stacked
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

    const data = prepareData(originalData)
    const labels = data.map(d => d['date'].slice(5, 10))

    const chart = initChart(
        { element: opts.element, title: opts.title, type: opts.type },
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
            element: 'infectedChangePercent',
            title: 'Daily New Infections (Last 14 days)',
            window: 14,
            datasets: [{
                label: 'Change (%)',
                valueGetter: d => d['infected']['daily_diff_percent'],
                borderColor: YELLOW_BORDER,
                backgroundColor: YELLOW,
            }]
        }
    ))

    charts.push(createChart(
        data,
        {
            element: 'infectedMA',
            title: 'Daily New Infections (Moving Average)',
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
            element: 'testedChange',
            title: 'Testing Day-to-Day Change (Last 14 days)',
            window: 14,
            datasets: [{
                label: 'Day-to-Day Change',
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
                label: 'Day-to-Day Change',
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
    })
}

document.addEventListener("DOMContentLoaded", loadData)

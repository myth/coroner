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

const options = {
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

const setStatus = ok => {
    const title = document.getElementById('title')
    if (!ok) {
        title.style.color = 'red';
    } else {
        title.style.color = 'unset';
    }
}

const getLastNumDays = (data, days) => {
    size = data['history'].length

    return data['history'].slice(size - days, size)
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

const createChart = (opts, datasets, labels) => {
    const ctx = document.getElementById(opts.element).getContext('2d')
    const type = opts.type || 'bar'
    const stacked = opts.stacked || false

    const globalOpts = {...options}

    if (opts.log) globalOpts.scales.yAxes[0].type = 'logarithmic'
    if (opts.stacked) {
        globalOpts.scales.xAxes[0].stacked = opts.stacked
        globalOpts.scales.yAxes[0].stacked = opts.stacked
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

const setElementContent = (id, value) => {
    document.getElementById(id).innerHTML = value
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

const bindDatePicker = data => {
    const history = data['history']
    const date = document.getElementById('counter-date')
    const slider = document.getElementById('datepicker')

    const updateDate = i => {
        date.innerHTML = history[i]['date']
    }

    updateDate(history.length - 1)

    slider.setAttribute('max', `${history.length - 1}`)
    slider.setAttribute('value', `${history.length - 1}`)

    slider.oninput = function() {
        const i = parseInt(this.value)

        updateDate(i)
        updateCounters(history[i])
    }
}

const updateCurrent = data => {
    setStatus(data['status'] === 'ok')

    const c = data['current']

    setElementContent('last-update', `Updated ${data['updated']}`)

    updateCounters(c)
}

const updateCharts = data => {
    createChart(
        { element: 'infected' },
        [{
            label: 'Total Infected',
            data: data['history'].map(d => d['infected']['total']),
            fill: true,
            borderColor: YELLOW_BORDER,
            backgroundColor: YELLOW,
        }],
        data['history'].map(d => d['date'].slice(5, 10)),
    )

    createChart(
        { element: 'infectedToday' },
        [{
            label: 'Daily Infected',
            data: data['history'].map(d => d['infected']['today']),
            fill: true,
            borderColor: BLUE_BORDER,
            backgroundColor: BLUE,
        }],
        data['history'].map(d => d['date'].slice(5, 10)),
    )

    createChart(
        { element: 'dead' },
        [{
            label: 'Total Deaths',
            data: data['history'].map(d => d['dead']['total']),
            fill: true,
            borderColor: RED_BORDER,
            backgroundColor: RED,
        }],
        data['history'].map(d => d['date'].slice(5, 10)),
    )

    createChart(
        { element: 'deadToday' },
        [{
            label: 'Daily Deaths',
            data: data['history'].map(d => d['dead']['today']),
            borderColor: RED_BORDER,
            backgroundColor: RED,
        }],
        data['history'].map(d => d['date'].slice(5, 10)),
    )

    const hData = data['history'].filter(d => d['hospitalized']['general']['total'] > 0)

    createChart(
        { element: 'hospitalized', title: 'Hospitalized' },
        [{
            label: 'Critical',
            data: hData.map(d => d['hospitalized']['critical']['total']),
            fill: true,
            borderColor: ORANGE_BORDER,
            backgroundColor: 'rgba(201, 78, 21, 0.5)',
        },
        {
            label: 'Total',
            data: hData.map(d => d['hospitalized']['general']['total']),
            fill: true,
            borderColor: PURPLE_BORDER,
            backgroundColor: PURPLE,
        }],
        hData.map(d => d['date'].slice(5, 10)),
    )

    const hsiData = data['history'].filter(d => d['hospital_staff']['infected']['total'] > 0)

    createChart(
        { element: 'hospitalStaffInfected' },
        [{
            label: 'Hospital Staff Infected',
            data: hsiData.map(d => d['hospital_staff']['infected']['total']),
            fill: true,
            borderColor: YELLOW_BORDER,
            backgroundColor: YELLOW,
        }],
        hsiData.map(d => d['date'].slice(5, 10)),
    )

    const hsqData = data['history'].filter(d => d['hospital_staff']['quarantined']['total'] > 0)

    createChart(
        { element: 'hospitalStaffQuarantined' },
        [{
            label: 'Hospital Staff Quarantined',
            data: hsqData.map(d => d['hospital_staff']['quarantined']['total']),
            fill: true,
            borderColor: BLUE_BORDER,
            backgroundColor: BLUE,
        }],
        hsqData.map(d => d['date'].slice(5, 10)),
    )

    const tData = data['history'].filter(d => d['tested']['total'] > 0)

    createChart(
        { element: 'tested' },
        [{
            label: 'Tested',
            data: tData.map(d => d['tested']['total']),
            fill: true,
            borderColor: GREEN_BORDER,
            backgroundColor: GREEN,
        }],
        tData.map(d => d['date'].slice(5, 10)),
    )

    // Growth factors

    const icpData = getLastNumDays(data, 14)

    createChart(
        { element: 'infectedChangePercent', title: 'Daily New Infections (Last 14 days)' },
        [{
            label: 'Change (%)',
            data: icpData.map(d => d['infected']['daily_diff_percent']),
            fill: true,
            borderColor: YELLOW_BORDER,
            backgroundColor: YELLOW,
        }],
        icpData.map(d => d['date'].slice(5, 10)),
    )

    createChart(
        { element: 'infectedMA', title: 'Daily New Infections (Moving Average)' },
        [{
            label: '3 day window',
            data: data['history'].map(d => d['infected']['today_mov_avg_3']),
            fill: true,
            borderColor: ORANGE_BORDER,
            backgroundColor: ORANGE,
        },
        {
            label: '5 day window',
            data: data['history'].map(d => d['infected']['today_mov_avg_5']),
            fill: true,
            borderColor: YELLOW_BORDER,
            backgroundColor: YELLOW,
        }],
        data['history'].map(d => d['date'].slice(5, 10)),
    )

    createChart(
        { element: 'infectedDoublingRate', title: 'Infection Doubling Rate' },
        [{
            label: 'Standard (days)',
            data: data['history'].map(d => d['infected']['doubling_rate']),
            fill: true,
            borderColor: ORANGE_BORDER,
            backgroundColor: ORANGE,
        },
        {
            label: '3 Day Moving Average (days)',
            data: data['history'].map(d => d['infected']['doubling_rate_from_mov_avg_3']),
            fill: true,
            borderColor: YELLOW_BORDER,
            backgroundColor: YELLOW,
        }],
        data['history'].map(d => d['date'].slice(5, 10)),
    )

    const tcpData = getLastNumDays(data, 14)

    createChart(
        { element: 'testedChange', title: 'Daily New Tests (Last 14 days)' },
        [{
            label: 'Daily Change',
            data: tcpData.map(d => d['tested']['daily_diff']),
            fill: true,
            borderColor: GREEN_BORDER,
            backgroundColor: GREEN,
        }],
        tcpData.map(d => d['date'].slice(5, 10)),
    )

    const thrpData = data['history'].filter(d => d['tested']['total'] > 0)

    createChart(
        { element: 'testedHitRatioPercent', title: 'Test Hit Ratio' },
        [{
            label: 'Hit Ratio (%)',
            data: thrpData.map(d => d['tested']['hit_ratio_percent']),
            fill: true,
            borderColor: GREEN_BORDER,
            backgroundColor: GREEN,
        }],
        thrpData.map(d => d['date'].slice(5, 10)),
    )

    const hcpData = data['history'].filter(d => d['hospitalized']['general']['total'] > 0)

    createChart(
        { element: 'hospitalizedChange', title: 'Daily Hospitalizations' },
        [{
            label: 'General',
            data: hcpData.map(d => d['hospitalized']['general']['today']),
            fill: true,
            borderColor: PURPLE_BORDER,
            backgroundColor: PURPLE,
        },
        {
            label: 'Critical',
            data: hcpData.map(d => d['hospitalized']['critical']['today']),
            fill: true,
            borderColor: ORANGE_BORDER,
            backgroundColor: 'rgba(201, 78, 21, 0.5)',
        }],
        hcpData.map(d => d['date'].slice(5, 10)),
    )

    const hmaData = data['history'].filter(d => d['hospitalized']['general']['total'] > 0)

    createChart(
        { element: 'hospitalizedMA', title: 'Daily Hospitalization Moving Average' },
        [{
            label: 'General (3 day window)',
            data: hmaData.map(d => d['hospitalized']['general']['today_mov_avg_3']),
            fill: true,
            borderColor: PURPLE_BORDER,
            backgroundColor: PURPLE,
        },
        {
            label: 'Critical (3 day window)',
            data: hmaData.map(d => d['hospitalized']['critical']['today_mov_avg_3']),
            fill: true,
            borderColor: ORANGE_BORDER,
            backgroundColor: 'rgba(201, 78, 21, 0.5)',
        }],
        hmaData.map(d => d['date'].slice(5, 10)),
    )

    const hdrData = getLastNumDays(data, 14)

    createChart(
        { element: 'hospitalizedDoublingRate', title: 'Hospitalization Doubling Rate (Last 14 days)' },
        [{
            label: 'Doubling Rate (days)',
            data: hdrData.map(d => d['hospitalized']['general']['doubling_rate']),
            fill: true,
            borderColor: PURPLE_BORDER,
            backgroundColor: PURPLE,
        }],
        hdrData.map(d => d['date'].slice(5, 10)),
    )

    const hsicpData = getLastNumDays(data, 14)

    createChart(
        { element: 'hospitalStaffInfectedChange', title: 'Daily Hospital Staff Infected (Last 14 days)' },
        [{
            label: 'Daily Change',
            data: hsicpData.map(d => d['hospital_staff']['infected']['daily_diff']),
            fill: true,
            borderColor: BLUE_BORDER,
            backgroundColor: BLUE,
        }],
        hsicpData.map(d => d['date'].slice(5, 10)),
    )

    const hsidrData = getLastNumDays(data, 14)

    createChart(
        { element: 'hospitalStaffInfectedDoublingRate', title: 'Hospital Staff Infected Doubling Rate (Last 14 days)' },
        [{
            label: 'Doubling Rate (days)',
            data: hsidrData.map(d => d['hospital_staff']['infected']['doubling_rate']),
            fill: true,
            borderColor: YELLOW_BORDER,
            backgroundColor: YELLOW,
        }],
        hsidrData.map(d => d['date'].slice(5, 10)),
    )
}

const loadData = async() => {
    fetch('/api').then(async r => {
        const data = await r.json()

        bindDatePicker(data)
        updateCurrent(data)
        updateCharts(data)
    })
}

document.addEventListener("DOMContentLoaded", loadData)

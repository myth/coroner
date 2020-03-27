// Chart config
Chart.defaults.global.elements.point.radius = 3
Chart.defaults.global.elements.line.borderWidth = 1

const ORANGE = 'rgba(201, 78, 21, 0.1)'
const RED = 'rgba(209, 29, 29, 0.1)'
const BLUE = 'rgba(29, 128, 209, 0.1)'
const GREEN = 'rgba(116, 209, 29, 0.1)'
const YELLOW = 'rgba(209, 182, 29, 0.1)'
const PURPLE = 'rgba(136, 26, 209, 0.1)'

const ORANGE_BORDER = 'rgba(201, 78, 21, 1.0)'
const RED_BORDER = 'rgba(209, 29, 29, 1.0)'
const BLUE_BORDER = 'rgba(29, 128, 209, 1.0)'
const GREEN_BORDER = 'rgba(116, 209, 29, 1.0)'
const YELLOW_BORDER = 'rgba(209, 182, 29, 1.0)'
const PURPLE_BORDER = 'rgba(136, 26, 209, 1.0)'

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

const getLastNumDays = (data, days) => {
    size = data['history'].length

    return data['history'].slice(size - days, size)
}

const createChart = (opts, datasets, labels) => {
    const ctx = document.getElementById(opts.element).getContext('2d')
    const type = opts.type || 'line'

    const globalOpts = {...options}

    if (opts.log) globalOpts.scales.yAxes[0].type = 'logarithmic'
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

const updateCurrent = data => {
    const c = data['current']

    const updated = document.getElementById('last-update')
    const infected = document.getElementById('counter-infected')
    const infectedToday = document.getElementById('counter-infected-today')
    const dead = document.getElementById('counter-dead')
    const deadToday = document.getElementById('counter-dead-today')
    const tested = document.getElementById('counter-tested')
    const population = document.getElementById('counter-population')
    const hospitalized = document.getElementById('counter-hospitalized')
    const hospitalizedCritical = document.getElementById('counter-hospitalized-critical')
    const hospitalStaffInfected = document.getElementById('counter-hospital-staff-infected')
    const hospitalStaffQuarantined = document.getElementById('counter-hospital-staff-quarantined')
    const populationCases = document.getElementById('counter-cases-in-population')
    const populationTested = document.getElementById('counter-tested-in-population')
    const mortalityRate = document.getElementById('counter-mortality-rate')
    const testedHitRatio = document.getElementById('counter-tested-hit-ratio')

    updated.innerHTML = `Updated ${data['updated']}`
    infected.innerHTML = c['infected']['total']
    infectedToday.innerHTML = c['infected']['today']
    dead.innerHTML = c['dead']['total']
    deadToday.innerHTML = c['dead']['today']
    tested.innerHTML = c['tested']['total']
    population.innerHTML = c['population']['total']
    hospitalized.innerHTML = c['hospitalized']['general']['total']
    hospitalizedCritical.innerHTML = c['hospitalized']['critical']['total']
    hospitalStaffInfected.innerHTML = c['hospital_staff']['infected']['total']
    hospitalStaffQuarantined.innerHTML = c['hospital_staff']['quarantined']['total']
    populationCases.innerHTML = `${c['population']['infected_percent']} %`
    populationTested.innerHTML = `${c['population']['tested_percent']} %`
    mortalityRate.innerHTML = `${c['dead']['mortality_percent']} %`
    testedHitRatio.innerHTML = `${c['tested']['hit_ratio_percent']} %`
}

const updateCharts = data => {
    createChart(
        { element: 'infected' },
        [{
            label: 'Total Infected',
            data: data['history'].map(d => d['infected']['total']),
            fill: true,
            borderColor: YELLOW_BORDER,
            backgroundColor: YELLOW
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
            backgroundColor: RED
        }],
        data['history'].map(d => d['date'].slice(5, 10)),
    )

    createChart(
        { element: 'deadToday', type: 'bar' },
        [{
            label: 'Daily Deaths',
            data: data['history'].map(d => d['dead']['today']),
            borderColor: RED_BORDER,
            backgroundColor: 'rgba(209, 29, 29, 0.3)',
            borderWidth: 1,
        }],
        data['history'].map(d => d['date'].slice(5, 10)),
    )

    const hData = data['history'].filter(d => d['hospitalized']['general']['total'] > 0)

    createChart(
        { element: 'hospitalized', title: 'Hospitalized' },
        [{
            label: 'Total',
            data: hData.map(d => d['hospitalized']['general']['total']),
            fill: true,
            borderColor: PURPLE_BORDER,
            backgroundColor: PURPLE
        },
        {
            label: 'Critical',
            data: hData.map(d => d['hospitalized']['critical']['total']),
            fill: true,
            borderColor: ORANGE_BORDER,
            backgroundColor: 'rgba(201, 78, 21, 0.5)'
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
            backgroundColor: YELLOW
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
            backgroundColor: BLUE
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
            backgroundColor: GREEN
        }],
        tData.map(d => d['date'].slice(5, 10)),
    )

    // Growth factors

    const icpData = getLastNumDays(data, 14)

    createChart(
        { element: 'infectedChangePercent', title: 'Daily New Infections (14 day window)' },
        [{
            label: 'Change (%)',
            data: icpData.map(d => d['infected']['daily_diff_percent']),
            fill: true,
            borderColor: YELLOW_BORDER,
            backgroundColor: YELLOW
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
            backgroundColor: ORANGE
        },
        {
            label: '5 day window',
            data: data['history'].map(d => d['infected']['today_mov_avg_5']),
            fill: true,
            borderColor: YELLOW_BORDER,
            backgroundColor: YELLOW
        }],
        data['history'].map(d => d['date'].slice(5, 10)),
    )

    const tcpData = getLastNumDays(data, 7)

    createChart(
        { element: 'testedChangePercent', title: 'Daily New Tests (7 day window)' },
        [{
            label: 'Change (%)',
            data: tcpData.map(d => d['tested']['daily_diff_percent']),
            fill: true,
            borderColor: GREEN_BORDER,
            backgroundColor: GREEN
        }],
        tcpData.map(d => d['date'].slice(5, 10)),
    )

    const thrpData = getLastNumDays(data, 14)

    createChart(
        { element: 'testedHitRatioPercent', title: 'Test Hit Ratio (14 day window)' },
        [{
            label: 'Hit Ratio (%)',
            data: thrpData.map(d => d['tested']['hit_ratio_percent']),
            fill: true,
            borderColor: GREEN_BORDER,
            backgroundColor: GREEN
        }],
        thrpData.map(d => d['date'].slice(5, 10)),
    )

    const hcpData = getLastNumDays(data, 14)

    createChart(
        { element: 'hospitalizedChangePercent', title: 'Daily Hospitalization (14 day window)' },
        [{
            label: 'General (%)',
            data: hcpData.map(d => d['hospitalized']['general']['daily_diff_percent']),
            fill: true,
            borderColor: PURPLE_BORDER,
            backgroundColor: PURPLE
        },
        {
            label: 'Critical (%)',
            data: hcpData.map(d => d['hospitalized']['critical']['daily_diff_percent']),
            fill: true,
            borderColor: ORANGE_BORDER,
            backgroundColor: 'rgba(201, 78, 21, 0.5)'
        }],
        hcpData.map(d => d['date'].slice(5, 10)),
    )

    const hmaData = getLastNumDays(data, 14).filter(d => d['hospitalized']['general']['total'] > 0)

    createChart(
        { element: 'hospitalizedMA', title: 'Daily Hospitalization (Moving Average)' },
        [{
            label: 'General (3 day window)',
            data: hmaData.map(d => d['hospitalized']['general']['today_mov_avg_3']),
            fill: true,
            borderColor: PURPLE_BORDER,
            backgroundColor: PURPLE
        },
        {
            label: 'Critical (3 day window)',
            data: hmaData.map(d => d['hospitalized']['critical']['today_mov_avg_3']),
            fill: true,
            borderColor: ORANGE_BORDER,
            backgroundColor: 'rgba(201, 78, 21, 0.5)'
        }],
        hmaData.map(d => d['date'].slice(5, 10)),
    )

    const hsicpData = getLastNumDays(data, 14)

    createChart(
        { element: 'hospitalStaffInfectedChange', title: 'Daily Hospital Staff Infected' },
        [{
            label: 'Daily Change',
            data: hsicpData.map(d => d['hospital_staff']['infected']['daily_diff']),
            fill: true,
            borderColor: BLUE_BORDER,
            backgroundColor: BLUE
        }],
        hsicpData.map(d => d['date'].slice(5, 10)),
    )
}

const loadData = async() => {
    fetch('/api').then(async r => {
        const data = await r.json()

        updateCurrent(data)
        updateCharts(data)
    })
}

document.addEventListener("DOMContentLoaded", loadData)

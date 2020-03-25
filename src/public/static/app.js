// Chart config
Chart.defaults.global.elements.point.radius = 2
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
    const confirmed = document.getElementById('counter-confirmed')
    const newConfirmed = document.getElementById('counter-new-confirmed')
    const dead = document.getElementById('counter-dead')
    const newDead = document.getElementById('counter-new-dead')
    const tested = document.getElementById('counter-tested')
    const population = document.getElementById('counter-population')
    const hospitalized = document.getElementById('counter-hospitalized')
    const hospitalizedCritical = document.getElementById('counter-hospitalized-critical')
    const hospitalStaffInfected = document.getElementById('counter-hospital-staff-infected')
    const hospitalStaffQuarantined = document.getElementById('counter-hospital-staff-quarantined')
    const populationCases = document.getElementById('counter-cases-in-population')
    const populationTested = document.getElementById('counter-tested-in-population')

    updated.innerHTML = `Updated ${data['updated']}`
    confirmed.innerHTML = c['confirmed']
    newConfirmed.innerHTML = c['new_confirmed']
    dead.innerHTML = c['dead']
    newDead.innerHTML = c['new_dead']
    tested.innerHTML = c['tested']
    population.innerHTML = c['population']
    hospitalized.innerHTML = c['hospitalized']
    hospitalizedCritical.innerHTML = c['hospitalized_critical']
    hospitalStaffInfected.innerHTML = c['hospital_staff_infected']
    hospitalStaffQuarantined.innerHTML = c['hospital_staff_quarantined']
    populationCases.innerHTML = `${(c['confirmed'] / c['population'] * 100.0).toFixed(3)} %`
    populationTested.innerHTML = `${(c['tested'] / c['population'] * 100).toFixed(3)} %`
}

const loadData = async() => {
    fetch('/api').then(async r => {
        const data = await r.json()

        updateCurrent(data)

        const confirmedChart = createChart(
            { element: 'confirmed' },
            [{
                label: 'Confirmed Cases',
                data: data['history'].map(d => d['confirmed']),
                fill: true,
                borderColor: YELLOW_BORDER,
                backgroundColor: YELLOW
            }],
            data['history'].map(d => d['date'].slice(5, 10)),
        )

        const newConfirmedChart = createChart(
            { element: 'newConfirmed' },
            [{
                label: 'Daily Cases',
                data: data['history'].map(d => d['new_confirmed']),
                fill: true,
                borderColor: BLUE_BORDER,
                backgroundColor: BLUE,
            }],
            data['history'].map(d => d['date'].slice(5, 10)),
        )

        const deadChart = createChart(
            { element: 'dead' },
            [{
                label: 'Dead',
                data: data['history'].map(d => d['dead']),
                fill: true,
                borderColor: RED_BORDER,
                backgroundColor: RED
            }],
            data['history'].map(d => d['date'].slice(5, 10)),
        )

        const newDeadChart = createChart(
            { element: 'newDead', type: 'bar' },
            [{
                label: 'Daily Deaths',
                data: data['history'].map(d => d['new_dead']),
                borderColor: RED_BORDER,
                backgroundColor: 'rgba(209, 29, 29, 0.3)',
                borderWidth: 1,
            }],
            data['history'].map(d => d['date'].slice(5, 10)),
        )

        const hospitalChart = createChart(
            { element: 'hospitalized' },
            [{
                label: 'Hospitalized',
                data: data['history'].filter(d => d['hospitalized'] > 0).map(d => d['hospitalized']),
                fill: true,
                borderColor: PURPLE_BORDER,
                backgroundColor: PURPLE
            },
            {
                label: 'Critical',
                data: data['history'].filter(d => d['hospitalized'] > 0).map(d => d['hospitalized_critical']),
                fill: true,
                borderColor: ORANGE_BORDER,
                backgroundColor: 'rgba(201, 78, 21, 0.5)'
            }],
            data['history'].filter(d => d['hospitalized'] > 0).map(d => d['date'].slice(5, 10)),
        )

        const hospitalStaffInfectedChart = createChart(
            { element: 'hospitalStaffInfected' },
            [{
                label: 'Hospital Staff Infected',
                data: data['history'].filter(d => d['hospital_staff_infected'] > 0).map(d => d['hospital_staff_infected']),
                fill: true,
                borderColor: YELLOW_BORDER,
                backgroundColor: YELLOW
            }],
            data['history'].filter(d => d['hospital_staff_infected'] > 0).map(d => d['date'].slice(5, 10)),
        )

        const hospitalStaffQuarantinedChart = createChart(
            { element: 'hospitalStaffQuarantined' },
            [{
                label: 'Hospital Staff Quarantined',
                data: data['history'].filter(d => d['hospital_staff_quarantined'] > 0).map(d => d['hospital_staff_quarantined']),
                fill: true,
                borderColor: BLUE_BORDER,
                backgroundColor: BLUE
            }],
            data['history'].filter(d => d['hospital_staff_quarantined'] > 0).map(d => d['date'].slice(5, 10)),
        )

        const testedChart = createChart(
            { element: 'tested' },
            [{
                label: 'Tested',
                data: data['history'].filter(d => d['tested'] > 0).map(d => d['tested']),
                fill: true,
                borderColor: GREEN_BORDER,
                backgroundColor: GREEN
            }],
            data['history'].filter(d => d['hospital_staff_quarantined'] > 0).map(d => d['date'].slice(5, 10)),
        )

        // Growth factors

        const confirmedGrowthFactorChart = createChart(
            { element: 'confirmedGrowthFactor', title: 'Total Confirmed Cases (14 day window)' },
            [{
                label: 'Daily Increase (%)',
                data: data['history'].slice(
                    data['history'].length - 14, data['history'].length
                ).map(
                    d => (d['confirmed_growth_factor'] - 1.0) * 100
                ),
                fill: true,
                borderColor: ORANGE_BORDER,
                backgroundColor: ORANGE
            }],
            data['history'].slice(data['history'].length - 14, data['history'].length).map(d => d['date'].slice(5, 10)),
        )

        const newConfirmedGrowthFactorChart = createChart(
            { element: 'newConfirmedGrowthFactor', title: 'New Cases (14 day window)' },
            [{
                label: 'Daily Change (%)',
                data: data['history'].slice(
                    data['history'].length - 14, data['history'].length
                ).map(
                    d => (d['new_confirmed_growth_factor'] - 1.0) * 100
                ),
                fill: true,
                borderColor: BLUE_BORDER,
                backgroundColor: BLUE
            }],
            data['history'].slice(data['history'].length - 14, data['history'].length).map(d => d['date'].slice(5, 10)),
        )

        const hospitalGrowthFactorChart = createChart(
            { element: 'hospitalGrowthFactor', title: 'Daily Hospitalization Increase (7 day window)' },
            [{
                label: 'Regular (%)',
                data: data['history'].slice(
                    data['history'].length - 7, data['history'].length
                ).map(
                    d => (d['hospitalized_growth_factor'] - 1.0) * 100
                ),
                fill: true,
                borderColor: PURPLE_BORDER,
                backgroundColor: PURPLE
            },
            {
                label: 'Critical (%)',
                data: data['history'].slice(
                    data['history'].length - 7, data['history'].length
                ).map(
                    d => (d['hospitalized_critical_growth_factor'] - 1.0) * 100
                ),
                fill: true,
                borderColor: ORANGE_BORDER,
                backgroundColor: ORANGE
            }],
            data['history'].slice(data['history'].length - 7, data['history'].length).map(d => d['date'].slice(5, 10)),
        )
    })
}

document.addEventListener("DOMContentLoaded", loadData)

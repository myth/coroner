// Chart config
Chart.defaults.global.elements.point.radius = 2
Chart.defaults.global.elements.line.borderWidth = 1

const ORANGE = 'rgba(201, 78, 21, 0.8)'
const RED = 'rgba(209, 29, 29, 0.8)'
const BLUE = 'rgba(29, 128, 209, 0.8)'
const GREEN = 'rgba(116, 209, 29, 0.8)'
const YELLOW = 'rgba(209, 182, 29, 0.8)'
const PURPLE = 'rgba(136, 26, 209, 0.8)'

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

    return new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: datasets
        },
        options: options
    })
}

const loadData = async() => {
    fetch('/api').then(async r => {
        const data = await r.json()

        const confirmedChart = createChart(
            { element: 'confirmed' },
            [{
                label: 'Confirmed Cases',
                data: data['history'].map(d => d['confirmed']),
                fill: false,
                borderColor: YELLOW,
                backgroundColor: YELLOW
            }],
            data['history'].map(d => d['date'].slice(5, 10)),
        )

        const newConfirmedChart = createChart(
            { element: 'newConfirmed' },
            [{
                label: 'Daily Cases',
                data: data['history'].map(d => d['new_confirmed']),
                fill: false,
                borderColor: BLUE,
                backgroundColor: BLUE,
            }],
            data['history'].map(d => d['date'].slice(5, 10)),
        )

        const deadChart = createChart(
            { element: 'dead' },
            [{
                label: 'Dead',
                data: data['history'].map(d => d['dead']),
                fill: false,
                borderColor: RED,
                backgroundColor: RED
            }],
            data['history'].map(d => d['date'].slice(5, 10)),
        )

        const newDeadChart = createChart(
            { element: 'newDead', type: 'bar' },
            [{
                label: 'Daily Deaths',
                data: data['history'].map(d => d['new_dead']),
                fill: false,
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
                fill: false,
                borderColor: PURPLE_BORDER,
                backgroundColor: PURPLE
            },
            {
                label: 'Critical',
                data: data['history'].filter(d => d['hospitalized'] > 0).map(d => d['hospitalized_critical']),
                fill: false,
                borderColor: ORANGE_BORDER,
                backgroundColor: ORANGE
            }],
            data['history'].filter(d => d['hospitalized'] > 0).map(d => d['date'].slice(5, 10)),
        )

        const hospitalStaffInfectedChart = createChart(
            { element: 'hospitalStaffInfected' },
            [{
                label: 'Hospital Staff Infected',
                data: data['history'].filter(d => d['hospital_staff_infected'] > 0).map(d => d['hospital_staff_infected']),
                fill: false,
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
                fill: false,
                borderColor: GREEN_BORDER,
                backgroundColor: GREEN
            }],
            data['history'].filter(d => d['hospital_staff_quarantined'] > 0).map(d => d['date'].slice(5, 10)),
        )
    })
}

document.addEventListener("DOMContentLoaded", loadData)
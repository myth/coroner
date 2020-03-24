// Chart config
Chart.defaults.global.elements.point.backgroundColor = 'rgba(255, 0, 0, 0.8)'
Chart.defaults.global.elements.point.radius = 2

Chart.defaults.global.elements.line.borderWidth = 1
Chart.defaults.global.elements.line.borderColor = 'rgba(255, 0, 0, 0.5)'

const options = {
    responsive: false,
    scales: {
        xAxes: [{
            ticks: {
                autoSkip: true,
                maxTicksLimit:10
            }
        }]
    }
}

const loadData = async () => {
    fetch('/api').then(async r => {
        const data = await r.json()
        const confirmedCtx = document.getElementById('confirmed').getContext('2d')
        const newConfirmedCtx = document.getElementById('newConfirmed').getContext('2d')
        const deadCtx = document.getElementById('dead').getContext('2d')
        const newDeadCtx = document.getElementById('newDead').getContext('2d')

        const confirmedChart = new Chart(confirmedCtx, {
            type: 'line',
            data: {
                labels: data['history'].map(d => d['date'].slice(5, 10)),
                datasets: [{
                    label: 'Confirmed Cases',
                    data: data['history'].map(d => d['confirmed']),
                    fill: false
                }]
            },
            options: options
        })

        const newConfirmed = new Chart(newConfirmedCtx, {
            type: 'line',
            data: {
                labels: data['history'].map(d => d['date'].slice(5, 10)),
                datasets: [{
                    label: 'Daily New Confirmed Cases',
                    data: data['history'].map(d => d['new_confirmed']),
                    fill: false,
                    borderColor: 'rgba(0, 128, 255, 1.0)',
                    backgroundColor: 'rgba(0, 128, 255, 1.0)',
                }]
            },
            options: options
        })

        const deadChart = new Chart(deadCtx, {
            type: 'line',
            data: {
                labels: data['history'].map(d => d['date'].slice(5, 10)),
                datasets: [{
                    label: 'Deaths',
                    data: data['history'].map(d => d['dead']),
                    fill: false
                }]
            },
            options: options
        })

        const newDead = new Chart(newDeadCtx, {
            type: 'bar',
            data: {
                labels: data['history'].map(d => d['date'].slice(5, 10)),
                datasets: [{
                    label: 'Daily New Deaths',
                    data: data['history'].map(d => d['new_dead']),
                    fill: false,
                    borderColor: 'rgba(0, 128, 255, 1.0)',
                    backgroundColor: 'rgba(0, 128, 255, 1.0)',
                }]
            },
            options: options
        })
    })
}

document.addEventListener("DOMContentLoaded", loadData)

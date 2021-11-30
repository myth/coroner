// Chart config
Chart.defaults.global.elements.line.borderWidth = 1
Chart.defaults.global.defaultFontColor = '#9f9f9f';

const ORANGE = 'rgba(201, 78, 21, 0.7)'
const RED = 'rgba(209, 29, 29, 0.7)'
const BLUE = 'rgba(29, 128, 209, 0.7)'
const GREEN = 'rgba(116, 209, 29, 0.7)'
const YELLOW = 'rgba(209, 182, 29, 0.7)'
const PURPLE = 'rgba(136, 26, 209, 0.7)'

const ORANGE_BORDER = 'rgba(201, 78, 21, 1.0)'
const RED_BORDER = 'rgba(209, 29, 29, 1.0)'
const BLUE_BORDER = 'rgba(29, 128, 209, 1.0)'
const GREEN_BORDER = 'rgba(116, 209, 29, 1.0)'
const YELLOW_BORDER = 'rgba(209, 182, 29, 1.0)'
const PURPLE_BORDER = 'rgba(136, 26, 209, 1.0)'

const OPTIONS = {
    animation: false,
    maintainAspectRatio: false,
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
                maxTicksLimit: 10,
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
    if (opts.stacked) {
        globalOpts.scales.xAxes[0].stacked = true
        globalOpts.scales.yAxes[0].stacked = true
    }

    if (opts.labelX) {
        globalOpts.scales.xAxes[0].scaleLabel = {
            display: true,
            labelString: opts.labelX
        }
    }
    if (opts.labelY) {
        globalOpts.scales.yAxes[0].scaleLabel = {
            display: true,
            labelString: opts.labelY
        }
    }

    if (opts.minX !== undefined) {
        globalOpts.scales.xAxes[0].ticks = { min: opts.minX }
    }
    if (opts.minY !== undefined) {
        globalOpts.scales.yAxes[0].ticks = { min: opts.minY }
    }
    if (opts.maxX !== undefined) {
        globalOpts.scales.xAxes[0].ticks = { max: opts.maxX }
    }
    if (opts.maxY !== undefined) {
        globalOpts.scales.yAxes[0].ticks = { max: opts.maxX }
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
        options: globalOpts,
    })
}

const updateCounters = c => {
    setElementContent('counter-infected', c['infected.total'])
    setElementContent('counter-infected-today', c['infected.today'])
    setElementContent('counter-infected-change-percent', `${c['infected.delta_percent']} %`)
    setElementContent('counter-dead', c['dead.total'])
    setElementContent('counter-dead-today', c['dead.today'])
    setElementContent('counter-tested', c['tests.total'])
    setElementContent('counter-tested-today', c['tests.today'])
    setElementContent('counter-hospitalized', c['hospitalized.general.total'])
    setElementContent('counter-hospitalized-intensive-care', c['hospitalized.intensive_care.total'])
    setElementContent('counter-hospitalized-ventilator', c['hospitalized.ventilator.total'])
    setElementContent('counter-cases-in-population', `${c['population.infected']} %`)
    setElementContent('counter-mortality-rate', `${c['dead.mortality_rate']} %`)
    setElementContent('counter-tested-hit-ratio', `${c['tests.positive']} %`)
    setElementContent('counter-tested-hit-ratio-mov-avg-7', `${c['tests.positive_avg_7']} %`)
    setElementContent('counter-dose-1', c['vaccinated.dose_1.total'])
    setElementContent('counter-dose-2', c['vaccinated.dose_2.total'])
    setElementContent('counter-dose-3', c['vaccinated.dose_3.total'])
    setElementContent('counter-vaccinated-in-population-1', `${c['population.vaccinated_1']} %`)
    setElementContent('counter-vaccinated-in-population-2', `${c['population.vaccinated_2']} %`)
    setElementContent('counter-vaccinated-in-population-3', `${c['population.vaccinated_3']} %`)
}

const bindDatePicker = (data, charts) => {
    const slider = document.getElementById('datepicker')
    const prev = document.getElementById('datepicker-prev')
    const next = document.getElementById('datepicker-next')

    const updateDate = i => {
        setElementContent('counter-date', data[i]['date'])
    }

    updateDate(data.length - 1)

    slider.max = `${data.length - 1}`
    slider.value = `${data.length - 1}`

    const setDate = i => {
        slider.value = i

        updateDate(i)
        updateCounters(data[i])

        const newData = data.slice(0, i + 1)

        for (let chart of charts) {
            chart.update(newData)
        }
    }

    prev.onclick = () => {
        setDate(Math.max(0, parseInt(slider.value) - 1))
    }
    next.onclick = () => {
        setDate(Math.min(data.length - 1, parseInt(slider.value) + 1))
    }

    slider.oninput = () => {
        setDate(parseInt(slider.value))
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
            logY: opts.logY,
            stacked: opts.stacked
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
            element: 'infectedToday',
            datasets: [{
                label: 'Daily Infected',
                valueGetter: d => d['infected.today'],
                borderColor: ORANGE_BORDER,
                backgroundColor: ORANGE,
            }]
        },
    ))

    charts.push(createChart(
        data,
        {
            element: 'deadToday',
            datasets: [{
                label: 'Daily Deaths',
                valueGetter: d => d['dead.today'],
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
            filter: d => d['hospitalized.general.total'] > 0,
            stacked: true,
            datasets: [
            {
                label: 'Stable',
                valueGetter: d => d['hospitalized.general.total'],
                borderColor: PURPLE_BORDER,
                backgroundColor: PURPLE,
            },
            {
                label: 'Intensive Care',
                valueGetter: d => d['hospitalized.intensive_care.total'],
                borderColor: YELLOW_BORDER,
                backgroundColor: YELLOW,
            },
            {
                label: 'Ventilator',
                valueGetter: d => d['hospitalized.ventilator.total'],
                borderColor: RED_BORDER,
                backgroundColor: RED,
            }]
        },
    ))

    charts.push(createChart(
        data,
        {
            element: 'vaccinated',
            title: 'Daily Vaccinations',
            filter: d => d['vaccinated.doses.total'] > 0,
            stacked: true,
            datasets: [
            {
                label: 'Dose 1',
                valueGetter: d => d['vaccinated.dose_1.today'],
                borderColor: BLUE_BORDER,
                backgroundColor: BLUE,
            },
            {
                label: 'Dose 2',
                valueGetter: d => d['vaccinated.dose_2.today'],
                borderColor: GREEN_BORDER,
                backgroundColor: GREEN,
            },
            {
                label: 'Dose 3',
                valueGetter: d => d['vaccinated.dose_3.today'],
                borderColor: ORANGE_BORDER,
                backgroundColor: ORANGE,
            }]
        },
    ))

    charts.push(createChart(
        data,
        {
            element: 'tested',
            filter: d => d['tests.total'] > 0,
            datasets: [{
                label: 'Daily Tests',
                valueGetter: d => d['tests.today'],
                borderColor: GREEN_BORDER,
                backgroundColor: GREEN,
            }]
        },
    ))

    charts.push(createChart(
        data,
        {
            element: 'testedHitRatioPercent',
            title: 'Positive tests',
            filter: d => d['tests.total'] > 0,
            datasets: [{
                label: 'Positive (%)',
                valueGetter: d => d['tests.positive'],
                borderColor: YELLOW_BORDER,
                backgroundColor: YELLOW,
            }]
        },
    ))

    // Growth factors

    charts.push(createChart(
        data,
        {
            element: 'infectedMA',
            title: 'Daily New Infections (Moving Average last 30 days)',
            window: 30,
            type: 'line',
            datasets: [{
                label: '3 day window',
                valueGetter: d => d['infected.today_avg_3'],
                borderColor: YELLOW_BORDER,
                backgroundColor: YELLOW,
            },
            {
                label: '7 day window',
                valueGetter: d => d['infected.today_avg_7'],
                borderColor: ORANGE_BORDER,
                backgroundColor: ORANGE,
            }]
        }
    ))

    charts.push(createChart(
        data,
        {
            element: 'testedHitRatioPercentMovAvg',
            title: 'Positive tests (Moving Average last 30 days)',
            window: 30,
            type: 'line',
            datasets: [{
                label: '3 day window (%)',
                valueGetter: d => d['tests.positive_avg_3'],
                borderColor: YELLOW_BORDER,
                backgroundColor: YELLOW,
            },
            {
                label: '7 day window (%)',
                valueGetter: d => d['tests.positive_avg_7'],
                borderColor: BLUE_BORDER,
                backgroundColor: BLUE,
            }]
        }
    ))

    // charts.push(createChart(
    //     data,
    //     {
    //         element: 'hospitalizedChange',
    //         title: 'Daily Hospitalizations (Last 30 days)',
    //         filter: d => d['hospitalized.general.total'] > 0,
    //         window: 30,
    //         stacked: true,
    //         datasets: [{
    //             label: 'Stable',
    //             valueGetter: d => d['hospitalized.general.today'],
    //             borderColor: PURPLE_BORDER,
    //             backgroundColor: PURPLE,
    //         },
    //         {
    //             label: 'Intensive Care',
    //             valueGetter: d => d['hospitalized.intensive_care.today'],
    //             borderColor: YELLOW_BORDER,
    //             backgroundColor: YELLOW,
    //         },
    //         {
    //             label: 'Ventilator',
    //             valueGetter: d => d['hospitalized.ventilator.today'],
    //             borderColor: RED_BORDER,
    //             backgroundColor: RED,
    //         }]
    //     }
    // ))

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

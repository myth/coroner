const sir = (n, beta, gamma) => {
    return (x, y) => {
        s = -beta * y[0] * y[1] / n
        r = gamma * y[1]
        i = -(s + r)

        return [s, i, r]
    }
}

const createLabChart = (numDays, initialData) => {
    const days = new Array(numDays + 1)

    for (let i = 0; i < numDays + 1; i++) {
        days[i] = i
    }

    [S, I, R] = initialData

    const chart = initChart(
        { element: 'labChart', type: 'line', title: 'SIR Model Results' },
        [{
            label: 'Susceptible',
            data: S,
            borderColor: 'blue',
            pointRadius: 0,
            pointHoverRadius: 3,
        },
        {
            label: 'Infectious',
            data: I,
            borderColor: 'orange',
            pointRadius: 0,
            pointHoverRadius: 3,
        },
        {
            label: 'Removed',
            data: R,
            borderColor: 'green',
            pointRadius: 0,
            pointHoverRadius: 3
        }],
        days
    )

    return chart
}

class SimulationLab {
    constructor(days) {
        this.days = days
        this.population = 5367579

        this.susceptible = document.getElementById('lab-s')
        this.infectious = document.getElementById('lab-i')
        this.removed = document.getElementById('lab-r')
        this.beta = document.getElementById('lab-beta')
        this.gamma = document.getElementById('lab-gamma')

        this.chart = createLabChart(this.days, this.solve())

        this.bindEventListeners()
    }

    bindEventListeners() {
        const self = this

        this.infectious.oninput = function() {
            const i = parseInt(this.value)
            self.susceptible.innerHTML = 5367579 - i
            self.updateChart(self.solve())
        }
        this.beta.oninput = () => this.updateChart(this.solve())
        this.gamma.oninput = () => this.updateChart(this.solve())
    }

    solve() {
        let s = this.population
        let i = parseInt(this.infectious.value)
        let r = parseInt(this.removed.innerText)
        const beta = parseFloat(this.beta.value)
        const gamma = 1 / parseInt(this.gamma.value)

        const population = s + i

        s = s / population
        i = i / population
        r = r / population

        const init = [s, i, r]
        const solver = new Solver(3)

        solver.denseOutput = true

        const sCurve = new Array(this.days)
        const iCurve = new Array(this.days)
        const rCurve = new Array(this.days)

        solver.solve(sir(s, beta, gamma), 0, init, this.days, solver.grid(1, (x, y) => {
            sCurve[x] = y[0] * population
            iCurve[x] = y[1] * population
            rCurve[x] = y[2] * population
        }))

        return [sCurve, iCurve, rCurve]
    }

    updateChart(data) {
        this.chart.data.datasets[0].data = data[0]
        this.chart.data.datasets[1].data = data[1]
        this.chart.data.datasets[2].data = data[2]

        this.chart.update()
    }
}

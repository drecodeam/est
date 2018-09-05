import {Component, OnInit, AfterViewInit, OnChanges, HostListener, ElementRef, Renderer2} from '@angular/core';
import {ElectronService} from '../../providers/electron.service';

export enum KEY_CODE {
    DOWN_ARROW = 40,
    UP_ARROW = 38,
    N_KEY = 78,
    SPACE_KEY = 32,
    ESCAPE_KEY = 27,
    ENTER_KEY = 13
}

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit {

    constructor(
        private electronService: ElectronService,
        private el: ElementRef
    ) {
    }

    // COMMONLY USED ELECTRON SERVICE REFERENCES
    filePath = this.electronService.remote.app.getPath('appData') + '/list2.json';
    fs = this.electronService.fs;
    app = this.electronService.remote.app;
    window = this.electronService.remote.getCurrentWindow();
    touchBarButton = this.electronService.remote.TouchBar.TouchBarButton;

    data;
    currentTaskID;
    currentTask;
    currentTaskStartTime;
    currentInterval;
    placeholderIterator = 0;
    addTaskInput: HTMLInputElement;
    totalTime = 0;
    pointerFirstTask: HTMLInputElement;
    pointerCurrentTask;
    totalHrs;
    totalMins;
    eta: any;
    firstTaskNavigate = false;
    inputError = false;
    status = {
        showOnboarding: true
    };
    timeUnits = {
        seconds: {
            patterns: ['second', 'sec', 's'],
            value: 1,
            formats: {
                'chrono': '',
                'micro': 's',
                'short': 'sec',
                'long': 'second'
            }
        },
        minutes: {
            patterns: ['minute', 'min', 'm(?!s)'],
            value: 60,
            formats: {
                'chrono': ':',
                'micro': 'm',
                'short': 'min',
                'long': 'minute'
            }
        },
        hours: {
            patterns: ['hour', 'hr', 'h'],
            value: 3600,
            formats: {
                'chrono': ':',
                'micro': 'h',
                'short': 'hr',
                'long': 'hour'
            }
        },
        days: {
            patterns: ['day', 'dy', 'd'],
            value: 86400,
            formats: {
                'chrono': ':',
                'micro': 'd',
                'short': 'day',
                'long': 'day'
            }
        },
        weeks: {
            patterns: ['week', 'wk', 'w'],
            value: 604800,
            formats: {
                'chrono': ':',
                'micro': 'w',
                'short': 'wk',
                'long': 'week'
            }
        },
        months: {
            patterns: ['month', 'mon', 'mo', 'mth'],
            value: 2628000,
            formats: {
                'chrono': ':',
                'micro': 'm',
                'short': 'mth',
                'long': 'month'
            }
        },
        years: {
            patterns: ['year', 'yr', 'y'],
            value: 31536000,
            formats: {
                'chrono': ':',
                'micro': 'y',
                'short': 'yr',
                'long': 'year'
            }
        }
    };
    placeholders = [
        '+ Add your task',
        '30 mins with Sarah',
        '1hr 15mins Working on the documentation',
        '45 mins standup'
    ];
    inputPlaceholder = this.placeholders[0];

    @HostListener('document:keyup', ['$event'])
    keyEvent(event: KeyboardEvent) {
        this.handleShortcuts(event);
    }

    /**
     * Return parsed time in 2h 4m format
     * @param text
     */
    parseTime(text) {
        let parsedTime = 0;
        const parsed = {
            time: 0,
            text: ''
        };
        // returns calculated values separated by spaces
        Object.entries(this.timeUnits).forEach(([key, unit]) => {
            unit.patterns.forEach((pattern) => {
                const regex = new RegExp('((?:\\d+\\.\\d+)|\\d+)\\s?(' + pattern + 's?(?=\\s|\\d|\\b))', 'gi');
                text = text.replace(regex, function (str, p1, p2) {
                    parsedTime += parseInt(p1, 10) * unit.value;
                    return '';
                });
            });
        });
        parsed.time = parsedTime;
        parsed.text = text;
        return parsed;
    }

    /**
     * Handle keyboard shortcuts
     * @param event
     */
    handleShortcuts(event: KeyboardEvent) {
        if ( this.status.showOnboarding ) {
            return false;
        }
        if (this.addTaskInput === document.activeElement) {
            if (event.keyCode === KEY_CODE.ESCAPE_KEY) {
                if (this.addTaskInput === document.activeElement) {
                    this.addTaskInput.blur();
                    this.pointerCurrentTask = this.pointerFirstTask;
                    this.firstTaskNavigate = false;
                }
            }
            return false;
        }
        if ( this.pointerCurrentTask !== null ) {
            this.pointerCurrentTask.classList.remove('selected');
        }
        if (event.keyCode === KEY_CODE.DOWN_ARROW) {
            if (!this.firstTaskNavigate) {
                this.firstTaskNavigate = true;
                this.pointerCurrentTask.classList.add('selected');
            } else {
                if (this.pointerCurrentTask.nextElementSibling) {
                    this.pointerCurrentTask = this.pointerCurrentTask.nextElementSibling;
                    this.pointerCurrentTask.classList.add('selected');
                }
            }
        }
        if (event.keyCode === KEY_CODE.UP_ARROW) {
            if (!this.firstTaskNavigate) {
                this.firstTaskNavigate = true;
                this.pointerCurrentTask.classList.add('selected');
            } else {
                if (this.pointerCurrentTask.previousElementSibling) {
                    this.pointerCurrentTask = this.pointerCurrentTask.previousElementSibling;
                    this.pointerCurrentTask.classList.add('selected');
                }
            }
        }
        if (event.keyCode === KEY_CODE.SPACE_KEY || event.keyCode === KEY_CODE.ENTER_KEY) {
            const currentTask = this.findTaskByID(this.pointerCurrentTask.id);
            this.activateTask(currentTask);
        }
        if (event.keyCode === KEY_CODE.N_KEY) {
            this.addTaskInput.value = null;
            this.addTaskInput.focus();
        }
    }

    /**
     * Find a task object given it's ID
     * @param id
     */
    findTaskByID(id) {
        if (!id) {
            console.warn('tried calling function findTaskByID without giving ID');
            return false;
        }
        id = parseInt(id, 10);
        let task;
        this.data.list.forEach((todo, index, list) => {
            if (id === todo.id) {
                task = todo;
            }
        });
        return task;
    }

    /**
     * Update the current task items from the list
     */
    getCurrentList() {
        try {
            this.data = JSON.parse(this.fs.readFileSync(this.filePath).toString());
            return this.data;
        } catch (error) {
            // if there was some kind of error, return the passed in defaults instead.
            console.log('there seems to be an issue getting the current data');
            if (!this.data) {
                this.data = {
                    hideOnboarding: false,
                    list: []
                };
                this.fs.writeFileSync(this.filePath, this.data, 'utf-8');
            }
            return this.data;
        }
    }

    /**
     * Start the timer on a task
     * @param task
     * @returns {boolean}
     */
    activateTask(task) {
        if (!task || task.isTicked) {
            return false;
        }
        clearInterval(this.currentInterval);
        this.currentTaskID = task.id;
        this.currentTask = task;
        if (task.isActive) {
            task.isActive = false;
            this.currentTaskID = 0;
            this.updateData();
        } else {
            task.isActive = true;
            this.currentTaskStartTime = new Date();
            task.startTime = this.currentTaskStartTime;
            this.currentInterval = setInterval(() => this.updateTaskUI(task), 60000);
        }
    }

    /**
     * Get the time to be completion displayed
     * @param minutes
     */
    getDisplayTime(minutes) {
        minutes = parseInt(minutes, 10);
        const totalHrs = Math.floor(minutes / 60);
        const totalMins = minutes % 60;
        let displayTime = '';

        displayTime += (totalHrs > 0) ? totalHrs + 'h' : '';
        displayTime += (totalMins > 0) ? ' ' + totalMins + 'm' : '';

        return displayTime;

    }

    /**
     * Update the UI of the active task
     * @param task
     */
    updateTaskUI(task) {
        // const label = new this.touchBarButton({
        //     label: timeLeft + 'm | ' + task.name
        // });
        // const touchhBar = new this.electronService.remote.TouchBar({
        //     items: [label]
        // });
        // this.electronService.remote.getCurrentWindow().setTouchBar(touchhBar);
        if (task.elapsed === task.time) {
            clearInterval(this.currentInterval);
            task.isComplete = true;
            return;
        }
        if (task.elapsed > task.time) {
            task.elapsed = task.time;
            clearInterval(this.currentInterval);
        }
        task.elapsed++;
        task.displayTime = this.getDisplayTime(task.time - task.elapsed);
        this.totalTime--;
        this.updateEta();
        task.progress = ((task.elapsed) / (task.time)) * 100;
        this.updateData();
    }

    /**
     * Clear all the tasks.
     * Only used in development purpose for releasing a new build
     */
    clearTask() {
        this.data = '';
        this.updateData();
    }

    /**
     * Sync data onto the file
     */
    updateData() {
        if (this.data.list.length <= 0) {
            this.status.showOnboarding = true;
        } else {
            this.status.showOnboarding = false;
        }
        this.fs.writeFileSync(this.filePath, JSON.stringify(this.data));
    }

    /**
     *
     * @param date
     */
    formatAMPM(date) {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        this.eta = hours + ':' + minutes + ' ' + ampm;
    }

    /**
     * Mark the item as complete
     * @param task
     */
    markItemComplete(task) {
        task.isTicked = true;
        this.totalTime = this.totalTime - (task.time - task.elapsed);
        this.currentTaskID = 0;
        this.updateEta();
        this.updateData();
    }

    /**
     * Mark the item as complsete
     * @param task
     */
    deleteItem(task) {
        this.data.list.forEach((todo, index, list) => {
            if (task.id === todo.id) {
                list.splice(index, 1);
            }
        });
        if (!task.isTicked) {
            this.totalTime = this.totalTime - (task.time - task.elapsed);
            this.updateEta();
            this.updateData();
            setTimeout(() => {
                this.updateUI();
            }, 1);
        }
    }

    /**
     * Update the ETA on the top right
     */
    updateEta() {
        this.totalHrs = Math.floor(this.totalTime / 60);
        this.totalMins = this.totalTime % 60;
        const date = new Date(new Date().getTime() + this.totalTime * 60000);
        this.formatAMPM(date);
    }

    /**
     * A function to loop over different placeholder texts to be shown in onboarding
     */
    changePlaceholder() {
        this.placeholderIterator++;
        if (this.placeholderIterator >= this.placeholders.length) {
            this.placeholderIterator = 0;
        }
        this.inputPlaceholder = this.placeholders[this.placeholderIterator];
    }


    /**
     * Sanitize the list whenever the app loads.
     * Basically remove bogus entries, empty entries, completed entries etc
     */
    sanitizeData() {
        this.totalTime = 0;
        this.data.list.forEach((todo, index, list) => {
            if (todo.elapsed === null || todo.elapsed === undefined) {
                todo.elapsed = 0;
            } else if (todo.elapsed > todo.time) {
                todo.elapsed = todo.time;
            } else if (todo.elapsed < 0) {
                todo.elapsed = 0;
            } else if (todo.isTicked) {
                list.splice(index, 1);
            } else {
                this.totalTime += (todo.time - todo.elapsed);
                this.updateEta();
            }
            todo.displayTime = this.getDisplayTime(todo.time - todo.elapsed);
        });
    }

    /**
     * Add a new task
     * @param {String} inputString
     * @returns {boolean}
     */
    addTask(inputString: String) {
        if (!inputString) {
            return false;
        }
        this.inputPlaceholder = this.placeholders[0];
        const taskID = new Date().getUTCMilliseconds();
        const parsedString = this.parseTime(inputString);
        if (isNaN(parsedString.time) || parsedString.time <= 0) {
            this.status.showOnboarding = false;
            this.inputError = true;
            return false;
        }
        const time = Math.floor(parsedString.time / 60);
        const task = parsedString.text;
        this.addTaskInput.value = '';
        this.data.list.push({
            id: taskID,
            time: time,
            displayTime: this.getDisplayTime(time),
            elapsed: 0,
            name: task,
            isTicked: false
        });
        this.sanitizeData();
        this.updateEta();
        this.updateData();
        this.inputError = false;
        setTimeout(() => {
            this.updateUI();
        }, 1);

    }

    updateUI() {
        const containerElement: HTMLElement = document.querySelector('.container');
        const windowHeight = containerElement.offsetHeight;
        this.window.setSize(350, windowHeight, false);
    }

    isElectron = () => {
        return window && window.process && window.process.type;
    }

    ngAfterViewInit() {
        this.pointerFirstTask = document.querySelector('.task-list-item');
        this.pointerCurrentTask = this.pointerFirstTask;
        this.addTaskInput = document.querySelector('.add-task');
        this.updateUI();
    }

    ngOnInit() {
        const data = this.getCurrentList();
        this.sanitizeData();
        this.updateData();
    }
}

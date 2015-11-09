var Datepicker;

(function (window, $, undefined) {
    var pluginName = 'datepicker',
        $body, $datepickersContainer,
        baseTemplate = '' +
            '<div class="datepicker">' +
            '<nav class="datepicker--nav"></nav>' +
            '<div class="datepicker--content"></div>' +
            '</div>',
        defaults = {
            //TODO сделать работу с инпутом
            inline: true,
            region: 'ru',
            firstDay: 1, // Week's first day
            start: '', // Start date
            weekends: [6, 0],
            defaultView: 'days',
            //TODO сделать минимальный вид
            minView: 'days',
            dateFormat: 'dd.mm.yyyy',
            toggleSelected: true,

            //TODO сделать тоже самое с годами
            showOtherMonths: true,
            selectOtherMonths: true,
            moveToOtherMonthsOnSelect: true,

            minDate: '',
            maxDate: '',
            disableNavWhenOutOfRange: true,

            //TODO возможно добавить огрнаичивать число выделяемых дат
            multipleDates: false,
            multipleDatesSeparator: ',',

            // navigation
            prevHtml: '&laquo;',
            nextHtml: '&raquo;',

            // events
            onChange: '',
            onRenderCell: ''
        };

    Datepicker  = function (el, options) {
        this.$el = typeof el == 'string' ? $(el) : el;

        this.opts = $.extend({}, defaults, options);

        if (!this.opts.start) {
            this.opts.start = new Date();
        }
        if (this.containerBuilt && !this.opts.inline) {
            this._buildDatepickersContainer();
        }

        this.loc = Datepicker.region[this.opts.region];

        if ($body == undefined) {
            $body = $('body');
        }

        this.inited = false;
        this.silent = false; // Need to prevent unnecessary rendering

        this.currentDate = this.opts.start;
        this.currentView = this.opts.defaultView;
        this.minDate = this.opts.minDate ? this.opts.minDate : new Date(-8639999913600000);
        this.maxDate = this.opts.maxDate ? this.opts.maxDate : new Date(8639999913600000);
        this.selectedDates = [];
        this.views = {};

        this.init()
    };


    Datepicker.prototype = {
        containerBuilt: false,
        init: function () {
            this._buildBaseHtml();

            this.nav = new Datepicker.Navigation(this, this.opts);
            this.views[this.currentView] = new Datepicker.Body(this, this.currentView, this.opts);

            this.views[this.currentView].show();

            this.inited = true;
        },

        isWeekend: function (day) {
            return this.opts.weekends.indexOf(day) !== -1;
        },

        _buildDatepickersContainer: function () {
            this.containerBuilt = true;
            $body.append('<div class="datepickers-container" id="datepickers-container"></div>');
            $datepickersContainer = $('#datepickers-container');
        },

        _buildBaseHtml: function () {
            var $appendTarget = this.$el;
            if(!this.opts.inline) {
                $appendTarget = $datepickersContainer;
            }
            this.$datepicker = $(baseTemplate).appendTo($appendTarget);
            this.$content = $('.datepicker--content', this.$datepicker);
            this.$nav = $('.datepicker--nav', this.$datepicker);
        },

        _defineDOM: function () {

        },

        _triggerOnChange: function (cellType) {
            if (!this.selectedDates.length) {
                return this.opts.onChange('', '', this);
            }

            var selectedDates = this.selectedDates,
                parsedSelected = Datepicker.getParsedDate(selectedDates[0]),
                formattedDates = this.formatDate(this.opts.dateFormat, selectedDates[0]),
                _this = this,
                dates = new Date(parsedSelected.year, parsedSelected.month, parsedSelected.date);

            if (this.opts.multipleDates) {
                formattedDates = selectedDates.map(function (date) {
                    return _this.formatDate(_this.opts.dateFormat, date)
                }).join(this.opts.multipleDatesSeparator);

                // Create new dates array, to separate it from original selectedDates
                dates = selectedDates.map(function(date) {
                    var parsedDate = Datepicker.getParsedDate(date);
                    return new Date(parsedDate.year, parsedDate.month, parsedDate.date)
                })
            }

            this.opts.onChange(formattedDates, dates, this);
        },

        next: function () {
            var d = this.parsedDate;
            switch (this.view) {
                case 'days':
                    this.date = new Date(d.year, d.month + 1, 1);
                    break;
                case 'months':
                    this.date = new Date(d.year + 1, d.month, 1);
                    break;
                case 'years':
                    this.date = new Date(d.year + 10, 0, 1);
                    break;
            }
        },

        prev: function () {
            var d = this.parsedDate;
            switch (this.view) {
                case 'days':
                    this.date = new Date(d.year, d.month - 1, 1);
                    break;
                case 'months':
                    this.date = new Date(d.year - 1, d.month, 1);
                    break;
                case 'years':
                    this.date = new Date(d.year - 10, 0, 1);
                    break;
            }
        },

        formatDate: function (string, date) {
            var result = string,
                d = Datepicker.getParsedDate(date);

            switch (true) {
                case /dd/.test(result):
                    result = result.replace('dd', d.fullDate);
                case /d/.test(result):
                    result = result.replace('d', d.date);
                case /mm/.test(result):
                    result = result.replace('mm',d.fullMonth);
                case /m/.test(result):
                    result = result.replace('m',d.month + 1);
                case /MM/.test(result):
                    result = result.replace('MM', this.loc.months[d.month]);
                case /yyyy/.test(result):
                    result = result.replace('yyyy', d.year);
                case /yy/.test(result):
                    result = result.replace('yy', d.year.toString().slice(-2));
            }

            return result;
        },

        selectDate: function (date) {
            var d = this.parsedDate;

            if (date.getMonth() != d.month && this.opts.moveToOtherMonthsOnSelect) {
                this.silent = true;
                this.date = new Date(date.getFullYear(),date.getMonth(), 1);
                this.silent = false;
                this.nav._render()
            }

            if (this.opts.multipleDates) {
                if (!this._isSelected(date)) {
                    this.selectedDates.push(date);
                }
            } else {
                this.selectedDates = [date];
            }

            this.views[this.currentView]._render()
        },

        removeDate: function (date) {
            var selected = this.selectedDates,
                _this = this;

            return selected.some(function (curDate, i) {
                if (Datepicker.isSame(curDate, date)) {
                    selected.splice(i, 1);
                    _this.views[_this.currentView]._render();
                    return true
                }
            })
        },

        _isSelected: function (checkDate, cellType) {
            return this.selectedDates.some(function (date) {
                return Datepicker.isSame(date, checkDate, cellType)
            })
        },

        /**
         * Check if date is between minDate and maxDate
         * @param date {object} - date object
         * @param type {string} - cell type
         * @returns {boolean}
         * @private
         */
        _isInRange: function (date, type) {
            var time = date.getTime(),
                d = Datepicker.getParsedDate(date),
                min = Datepicker.getParsedDate(this.minDate),
                max = Datepicker.getParsedDate(this.maxDate),
                dMinTime = new Date(d.year, d.month, min.date).getTime(),
                dMaxTime = new Date(d.year, d.month, max.date).getTime(),
                types = {
                    day: time >= this.minTime && time <= this.maxTime,
                    month: dMinTime >= this.minTime && dMaxTime <= this.maxTime,
                    year: d.year >= min.year && d.year <= max.year
                };
            return type ? types[type] : types.day
        },

        get parsedDate() {
            return Datepicker.getParsedDate(this.date);
        },

        set date (val) {
            this.currentDate = val;

            if (this.inited && !this.silent) {
                this.views[this.view]._render();
                this.nav._render();
            }

            return val;
        },

        get date () {
            return this.currentDate
        },

        set view (val) {
            this.prevView = this.currentView;
            this.currentView = val;

            if (this.inited) {
                if (!this.views[val]) {
                    this.views[val] = new Datepicker.Body(this, val, this.opts)
                } else {
                    this.views[val]._render();
                }

                this.views[this.prevView].hide();
                this.views[val].show();
                this.nav._render();
            }

            return val
        },

        get view() {
            return this.currentView;
        },

        get minTime() {
            // Reset hours to 00:00, in case of new Date() is passed as option to minDate
            var min = Datepicker.getParsedDate(this.minDate);
            return new Date(min.year, min.month, min.date).getTime()
        },

        get maxTime() {
            var max = Datepicker.getParsedDate(this.maxDate);
            return new Date(max.year, max.month, max.date).getTime()
        }
    };

    Datepicker.getDaysCount = function (date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    Datepicker.getParsedDate = function (date) {
        return {
            year: date.getFullYear(),
            month: date.getMonth(),
            fullMonth: (date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1, // One based
            date: date.getDate(),
            fullDate: date.getDate() < 10 ? '0' + date.getDate() : date.getDate(),
            day: date.getDay()
        }
    };

    Datepicker.getDecade = function (date) {
        var firstYear = Math.floor(date.getFullYear() / 10) * 10;

        return [firstYear, firstYear + 9];
    };

    Datepicker.template = function (str, data) {
        return str.replace(/#\{([\w]+)\}/g, function (source, match) {
            if (data[match] || data[match] === 0) {
                return data[match]
            }
        });
    };

    Datepicker.isSame = function (date1, date2, type) {
        var d1 = Datepicker.getParsedDate(date1),
            d2 = Datepicker.getParsedDate(date2),
            _type = type ? type : 'day',

            conditions = {
                day: d1.date == d2.date && d1.month == d2.month && d1.year == d2.year,
                month: d1.month == d2.month && d1.year == d2.year,
                year: d1.year == d2.year
            };

        return conditions[_type];
    };

    $.fn[pluginName] = function ( options ) {
        if (Datepicker.prototype[options]) {
            Datepicker.prototype[options].apply(this.data(pluginName), Array.prototype.slice.call(arguments, 1));
        } else {
            return this.each(function () {
                if (!$.data(this, pluginName)) {
                    $.data(this,  pluginName,
                        new Datepicker( this, options ));
                } else {
                    var _this = $.data(this, pluginName),
                        oldOpts = _this.opts;

                    _this.opts = $.extend({}, oldOpts, options);
                }
            });
        }
    };

})(window, jQuery, '');
;(function () {
    Datepicker.region = {
        'ru': {
            days: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
            months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
        }
    }
})();

;(function () {
    var template = '' +
        '<div class="datepicker--nav-action" data-action="prev">#{prevHtml}</div>' +
        '<div class="datepicker--nav-title">#{title}</div>' +
        '<div class="datepicker--nav-action" data-action="next">#{nextHtml}</div>';

    Datepicker.Navigation = function (d, opts) {
        this.d = d;
        this.opts = opts;

        this.init();
    };

    Datepicker.Navigation.prototype = {
        init: function () {
            this._buildBaseHtml();
            this._bindEvents();
        },

        _bindEvents: function () {
            this.d.$nav.on('click', '.datepicker--nav-action', $.proxy(this._onClickNavButton, this));
            this.d.$nav.on('click', '.datepicker--nav-title', $.proxy(this._onClickNavTitle, this));
        },

        _buildBaseHtml: function () {
            this._render();
            this.$navButton = $('.datepicker--nav-action', this.d.$nav);
        },

        _render: function () {
            var title = this._getTitle(this.d.currentDate),
                html = Datepicker.template(template, $.extend({title: title}, this.opts));

            this.d.$nav.html(html);
            if (this.d.view == 'years') {
                $('.datepicker--nav-title', this.d.$nav).addClass('-disabled-');
            }
            this.setNavStatus();
        },

        _getTitle: function (date) {
            var month = this.d.loc.months[date.getMonth()],
                year = date.getFullYear(),
                decade = Datepicker.getDecade(date),
                types = {
                    days: month + ', ' + year,
                    months: year,
                    years: decade[0] + ' - ' + decade[1]
                };

            return types[this.d.view];
        },

        _onClickNavButton: function (e) {
            var $el = $(e.target),
                action = $el.data('action');

            this.d[action]();
        },

        _onClickNavTitle: function (e) {
            if ($(e.target).hasClass('-disabled-')) return;

            if (this.d.view == 'days') {
                return this.d.view = 'months'
            }

            this.d.view = 'years';
        },

        setNavStatus: function () {
            if (!(this.opts.minDate || this.opts.maxDate) || !this.opts.disableNavWhenOutOfRange) return;

            var date = this.d.parsedDate,
                m = date.month,
                y = date.year,
                d = date.date;

            switch (this.d.view) {
                case 'days':
                    if (!this.d._isInRange(new Date(y, m-1, d), 'month')) {
                        this._disableNav('prev')
                    }
                    if (!this.d._isInRange(new Date(y, m+1, d), 'month')) {
                        this._disableNav('next')
                    }
                    break;
                case 'months':
                    if (!this.d._isInRange(new Date(y-1, m, d), 'year')) {
                        this._disableNav('prev')
                    }
                    if (!this.d._isInRange(new Date(y+1, m, d), 'year')) {
                        this._disableNav('next')
                    }
                    break;
                case 'years':
                    if (!this.d._isInRange(new Date(y-10, m, d), 'year')) {
                        this._disableNav('prev')
                    }
                    if (!this.d._isInRange(new Date(y+10, m, d), 'year')) {
                        this._disableNav('next')
                    }
                    break;
            }
        },

        _disableNav: function (nav) {
            $('[data-action="' + nav + '"]', this.d.$nav).addClass('-disabled-')
        },

        _activateNav: function (nav) {
            $('[data-action="' + nav + '"]', this.d.$nav).removeClass('-disabled-')
        }

    }

})();

Datepicker.Cell = function () {

};
;(function () {
    var templates = {
        days:'' +
        '<div class="datepicker--days datepicker--body">' +
        '<div class="datepicker--days-names"></div>' +
        '<div class="datepicker--cells datepicker--cells-days"></div>' +
        '</div>',
        months: '' +
        '<div class="datepicker--months datepicker--body">' +
        '<div class="datepicker--cells datepicker--cells-months"></div>' +
        '</div>',
        years: '' +
        '<div class="datepicker--years datepicker--body">' +
        '<div class="datepicker--cells datepicker--cells-years"></div>' +
        '</div>'
    };

    Datepicker.Body = function (d, type, opts) {
        this.d = d;
        this.type = type;
        this.opts = opts;

        this.init();
    };

    Datepicker.Body.prototype = {
        init: function () {
            this._buildBaseHtml();
            this._render();

            this._bindEvents();
        },

        _bindEvents: function () {
            this.$el.on('click', '.datepicker--cell', $.proxy(this._onClickCell, this));
        },

        _buildBaseHtml: function () {
            this.$el = $(templates[this.type]).appendTo(this.d.$content);
            this.$names = $('.datepicker--days-names', this.$el);
            this.$cells = $('.datepicker--cells', this.$el);
        },

        _getDayNamesHtml: function (firstDay, curDay, html, i) {
            curDay = curDay != undefined ? curDay : firstDay;
            html = html ? html : '';
            i = i != undefined ? i : 0;

            if (i > 7) return html;
            if (curDay == 7) return this._getDayNamesHtml(firstDay, 0, html, ++i);

            html += '<div class="datepicker--day-name' + (this.d.isWeekend(curDay) ? " -weekend-" : "") + '">' + this.d.loc.days[curDay] + '</div>';

            return this._getDayNamesHtml(firstDay, ++curDay, html, ++i);
        },

        /**
         * Calculates days number to render. Generates days html and returns it.
         * @param {object} date - Date object
         * @returns {string}
         * @private
         */
        _getDaysHtml: function (date) {
            var totalMonthDays = Datepicker.getDaysCount(date),
                firstMonthDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay(),
                lastMonthDay = new Date(date.getFullYear(), date.getMonth(), totalMonthDays).getDay(),
                daysFromPevMonth = firstMonthDay - this.opts.firstDay,
                daysFromNextMonth = 6 - lastMonthDay + this.opts.firstDay;

            daysFromPevMonth = daysFromPevMonth < 0 ? daysFromPevMonth + 7 : daysFromPevMonth;
            daysFromNextMonth = daysFromNextMonth > 6 ? daysFromNextMonth - 7 : daysFromNextMonth;

            var startDayIndex = -daysFromPevMonth + 1,
                m, y,
                html = '';

            for (var i = startDayIndex, max = totalMonthDays + daysFromNextMonth; i <= max; i++) {
                y = date.getFullYear();
                m = date.getMonth();

                html += this._getDayHtml(new Date(y, m, i))
            }

            return html;
        },

        _getDayHtml: function (date) {
            var _class = "datepicker--cell datepicker--cell-day",
                currentDate = new Date(),
                d = Datepicker.getParsedDate(date),
                render = {},
                html = d.date;

            if (this.opts.onRenderCell) {
                render = this.opts.onRenderCell(date, 'day') || {};
                html = render.html ? render.html : html;
                _class += render.classes ? ' ' + render.classes : '';
            }

            if (this.d.isWeekend(d.day)) _class += " -weekend-";
            if (Datepicker.isSame(currentDate, date)) _class += ' -current-';
            if (this.d._isSelected(date, 'day')) _class += ' -selected-';
            if (!this.d._isInRange(date) || render.disabled) _class += ' -disabled-';
            if (d.month != this.d.parsedDate.month) {
                _class += " -other-month-";

                if (!this.opts.selectOtherMonths || !this.opts.showOtherMonths) {
                    _class += " -disabled-";
                }

                if (!this.opts.showOtherMonths) html = '';
            }

            return '<div class="' + _class + '" ' +
                'data-date="' + date.getDate() + '" ' +
                'data-month="' + date.getMonth() + '" ' +
                'data-year="' + date.getFullYear() + '">' + html + '</div>';
        },

        /**
         * Generates months html
         * @param {object} date - date instance
         * @returns {string}
         * @private
         */
        _getMonthsHtml: function (date) {
            var html = '',
                d = Datepicker.getParsedDate(date),
                i = 0;

            while(i < 12) {
                html += this._getMonthHtml(new Date(d.year, i));
                i++
            }

            return html;
        },

        _getMonthHtml: function (date) {
            var _class = "datepicker--cell datepicker--cell-month",
                d = Datepicker.getParsedDate(date),
                currentDate = new Date(),
                loc = this.d.loc,
                html = loc.months[d.month],
                render = {};

            if (this.opts.onRenderCell) {
                render = this.opts.onRenderCell(date, 'month') || {};
                html = render.html ? render.html : html;
                _class += render.classes ? ' ' + render.classes : '';
            }

            if (Datepicker.isSame(currentDate, date, 'month')) _class += ' -current-';
            if (!this.d._isInRange(date, 'month') || render.disabled) _class += ' -disabled-';

            return '<div class="' + _class + '" data-month="' + d.month + '">' + html + '</div>'
        },

        _getYearsHtml: function (date) {
            var d = Datepicker.getParsedDate(date),
                decade = Datepicker.getDecade(date),
                firstYear = decade[0] - 1,
                html = '',
                i = firstYear;

            for (i; i <= decade[1] + 1; i++) {
                html += this._getYearHtml(new Date(i , 0));
            }

            return html;
        },

        _getYearHtml: function (date) {
            var _class = "datepicker--cell datepicker--cell-year",
                decade = Datepicker.getDecade(this.d.date),
                currentDate = new Date(),
                d = Datepicker.getParsedDate(date),
                html = d.year,
                render = {};

            if (this.opts.onRenderCell) {
                render = this.opts.onRenderCell(date, 'year') || {};
                html = render.html ? render.html : html;
                _class += render.classes ? ' ' + render.classes : '';
            }

            if (d.year < decade[0] || d.year > decade[1]) {
                _class += ' -other-decade-';
            }

            if (Datepicker.isSame(currentDate, date, 'year')) _class += ' -current-';
            if (!this.d._isInRange(date, 'year') || render.disabled) _class += ' -disabled-';

            return '<div class="' + _class + '" data-year="' + d.year + '">' + html + '</div>'
        },

        _renderTypes: {
            days: function () {
                var dayNames = this._getDayNamesHtml(this.opts.firstDay),
                    days = this._getDaysHtml(this.d.currentDate);

                this.$cells.html(days);
                this.$names.html(dayNames)
            },
            months: function () {
                var html = this._getMonthsHtml(this.d.currentDate);

                this.$cells.html(html)
            },
            years: function () {
                var html = this._getYearsHtml(this.d.currentDate);

                this.$cells.html(html)
            }
        },

        _render: function () {
            this._renderTypes[this.type].bind(this)();
        },

        show: function () {
            this.$el.addClass('active');
            this.acitve = true;
        },

        hide: function () {
            this.$el.removeClass('active');
            this.active = false;
        },

        //  Events
        // -------------------------------------------------

        _handleClick: {
            days: function (el) {
                var date = el.data('date'),
                    month = el.data('month'),
                    year = el.data('year'),
                    selectedDate = new Date(year, month, date),
                    alreadySelected = this.d._isSelected(selectedDate, 'day'),
                    triggerOnChange = true;

                if (!alreadySelected) {
                    this.d.selectDate(selectedDate);
                } else if (alreadySelected && this.opts.toggleSelected){
                    this.d.removeDate(selectedDate);
                } else if (alreadySelected && !this.opts.toggleSelected) {
                    triggerOnChange = false;
                }

                if (triggerOnChange) {
                    this.d._triggerOnChange()
                }
            },
            months: function (el) {
                var month = el.data('month'),
                    d = this.d.parsedDate;

                this.d.silent = true;
                this.d.date = new Date(d.year, month, 1);
                this.d.silent = false;
                this.d.view = 'days';
            },
            years: function (el) {
                var year = el.data('year');

                this.d.silent = true;
                this.d.date = new Date(year, 0, 1);
                this.d.silent = false;
                this.d.view = 'months';
            }
        },

        _onClickCell: function (e) {
            var $el = $(e.target).closest('.datepicker--cell');

            if ($el.hasClass('-disabled-')) return;

            this._handleClick[this.d.currentView].bind(this)($el);
        }
    };
})();

if ( typeof Prototype == 'undefined' || parseFloat(Prototype.Version.substring(0, 3)) < 1.6 )
  throw('RangePicker necessita de Prototype 1.6 o superior.');

if ( typeof Date.CultureInfo == 'undefined' )
  throw('RangePicker necessita de la llibreria DateJS.');

var RangePickerOptions = {
  // locale options object
  // By using a localized culture info file (see the source code of the example site)
  // and localizing the strings here you should get a fully functional 
  // RangePicker in your own language.
  Locale: {
  
    date: {      
      // date format on the main display
      displayFormat: 'MMM d, yyyy',

      // main date format (for the inputs)
      format: Date.CultureInfo.formatPatterns.shortDate,

      // month names
      monthNames: Date.CultureInfo.monthNames,

      // day names
      dayNames: Date.CultureInfo.dayNames,

      // short day names
      shortestDayNames: Date.CultureInfo.shortestDayNames,

      // first day of week offset. 0 = Sunday, 1 = Monday
      weekOffset: Date.CultureInfo.firstDayOfWeek
    },

    captions: {      
      // today shortcut
      todayShortcutCaption: 'Today',

      // prev month button caption
      prevButtonCaption: '&laquo;',

      // next month button caption
      nextButtonCaption: '&raquo;',

      // date range selector label
      inputsLabel: 'Date range',

      // accept button caption
      okButtonCaption: 'Accept',

      // cancel button caption
      cancelButtonCaption: 'Cancel',

      invalidRangeMessage: 'Invalid date range!'
    }
  },

  // template options
  // mainly the range picker component DOM layout
  Template: {
    // main template (full rangepicker skeleton)
    main:  '<a id="rangepicker_display" href="#" title="#{rangeText}" class="display">' +
              '<table border="0" cellspacing="0" cellpadding="0">' +
                '<tbody>' +
                  '<tr>' +
                    '<td style="padding: 5px">#{rangeText}</td>' +
                    '<td class="dropdown down"></td>' +
                  '</tr>' +
                '</tbody>' +
              '</table>' +
            '</a>' +
            '<div id="rangepicker_calendars" class="calendars" style="display: none;">' +
              '<ul id="calendars_controls">' +
                '<li><a href="#" class="calendar_button prev">#{prevButtonCaption}</a></li>' +
                '<li><a href="#" class="calendar_button today">#{todayShortcutCaption}</a></li>' +
                '<li><a href="#" class="calendar_button next">#{nextButtonCaption}</a></li>' +
              '</ul>' +
              '<div id="calendars_container">#{calendars}</div>' +
              '<div id="rangepicker_controls" class="controls">' +
                '<div class="inputs">' +
                  '<label for="inici">#{inputsLabel}</label>' +
                  '<input type="text" name="inici" value="#{rangeStart}" id="inici" />' +
                  '&nbsp;&ndash;&nbsp;' +
                  '<input type="text" name="fi" value="#{rangeEnd}" id="fi" />&nbsp;' +
                  '<span id="range_error_description" style="display: none;"></span>' +
                '</div>' +
                '<div class="buttons">' +
                  '<input type="button" name="acceptar" value="#{okButtonCaption}" id="acceptar" />&nbsp;' +
                  '<a href="#" id="cancelar">#{cancelButtonCaption}</a>' +
                '</div>' +
              '</div>' +
            '</div>',

    // calendar
    calendar: {
      // weekday cell
      weekday: '<th scope="col" abbr="#{weekday_abbr}">#{weekday_short_desc}</th>',

      // calendar table
      table:   '<table id="#{calendar_id}" border="0" cellspacing="0" cellpadding="5">' +
                  '<caption></caption>' +
                  '<thead>' +
                    '<tr>' +
                       '#{weekdays}' +
                    '</tr>' +
                  '</thead>' +
                  '<tbody>' +
                    '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>' +
                    '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>' +
                    '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>' +
                    '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>' +
                    '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>' +
                    '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>' +
                  '</tbody>' +
                '</table>'
    }
  },

  // options
  Options: {
    // months shown at a time
    months: 3,

    // current month position
    // one of: 'first', 'last', 'middle'
    currentMonthPosition: 'last',

    // current date
    current: Date.today(),

    // earliest date which can be selected
    earliest: Date.today().add({years: -1}),

    // latest date which can be selected
    latest: Date.today(),

    // callback dispatched when range selection changes
    onRangeChange: Prototype.emptyFunction(),

    // wether to use effects (Script.aculo.us effects library needed)
    useEffects: typeof Effect != 'undefined'
  }
};

var RangePicker = Class.create({

  version: '0.5',

  initialize: function(element) {
    this.element = $(element);

    if ( !this.element )
      throw('Element de destí inexistent.');

    // shortcuts to config objects
    this.options = Object.extend(RangePickerOptions.Options, arguments[1] || {});
    this.locale = Object.extend(RangePickerOptions.Locale, arguments[2] || {});
    this.template = Object.extend(RangePickerOptions.Template, arguments[3] || {});

    // remove possible bad time info from earliest/latest timestamps
    this.options.earliest.clearTime();
    this.options.latest.clearTime().set({hour:23, minute: 59, second: 59});

    // set current range to current date
    this.date = this.options.current.clone();
    this.range = {start: this.date.clone(), end: this.date.clone()};

    // initalize selection object
    this.selecting = false;
    this.selection = {start: this.range.start.clone(), end: this.range.end.clone(), pin: null};

    // build DOM
    this.build();
    this.fill();

    // register event listeners
    this.registerEventObservers();
  },

  // constructs the DOM of the rangepicker component from the RangePickerOptions.Template
  // object and inserts it into the document.
  build: function() {
    var weekday = new Template(this.template.calendar.weekday);
    var weekdaysHtml = '';
    for (var i=0, m=this.locale.date.dayNames.length; i < m; ++i) {
      var p = (i + this.locale.date.weekOffset) % 7;
      weekdaysHtml += weekday.evaluate({
        weekday_abbr: this.locale.date.dayNames[p],
        weekday_short_desc: this.locale.date.shortestDayNames[p]
      });
    }

    var calendar = new Template(this.template.calendar.table);
    var calendarsHtml = '';
    for (var i=0, m=this.options.months; i < m; ++i) {
      calendarsHtml += calendar.evaluate({
        calendar_id: 'calendar_' + i,
        weekdays: weekdaysHtml
      });
    }

    var rangepicker = new Template(this.template.main);
    var conv = {
      rangeText: this.rangeToDisplayString(),
      calendars: calendarsHtml,
      rangeStart: this.range.start.toString(this.locale.date.format),
      rangeEnd: this.range.end.toString(this.locale.date.format),
      todayShortcutCaption: this.locale.captions.todayShortcutCaption,
      prevButtonCaption: this.locale.captions.prevButtonCaption,
      nextButtonCaption: this.locale.captions.nextButtonCaption,
      inputsLabel: this.locale.captions.inputsLabel,
      okButtonCaption: this.locale.captions.okButtonCaption,
      cancelButtonCaption: this.locale.captions.cancelButtonCaption
    };
    this.element.update(rangepicker.evaluate(conv));

    this.display = this.element.down('td');
    this.rangeControls = {
      start: $('inici'), 
      end: $('fi'), 
      errorMessage: $('range_error_description'), 
      okButton: $('acceptar'), 
      cancelButton: $('cancelar')
     };
  },

  // fills up the calendar with proper values given the selected date range
  // TODO: This function is quite heavy, should rethink its implementation...
  fill: function() {
    // get the start date (from which we'll start filling values)
    var start = this.date.clone().clearTime();
    var months = 0;
    switch( this.options.currentMonthPosition ) {
      case 'last':
        months = (this.options.months - 1) * -1;
        break;

      case 'middle':
        months = (new Number(this.options.months / 2)).floor() * -1;
        break;
    }
    start.addMonths(months);

    // for each month, fill its days
    for (var i=0, m=this.options.months; i < m; ++i) {
      var calendar = $('calendar_' + i);
      var caption = calendar.down('caption');
      // update caption with month name
      caption.update(this.locale.date.monthNames[start.getMonth()] + ' ' + start.getFullYear());

      var current = start.clone().moveToFirstDayOfMonth();
      // first day of month
      var firstDay = current.clone();
      // last day of month
      var lastDay = firstDay.clone().moveToLastDayOfMonth();
      // move the date to first monday (if necessary) of first week of the month. 
      // This should be the start date
      if (current.getDay() != 1)
        current = current.moveToDayOfWeek(1, -1);

      // fill up calendar cells
      calendar.select('td').each(function(cell) {
        cell.date = current.clone();
        cell.update(current.getDate());
        cell.writeAttribute('class', ''); // clear css classes

        // add proper class attributes
        if ( !current.between(firstDay, lastDay) )
          cell.addClassName('beyond');
        else
          cell.addClassName('active');

        if ( current.equals(this.options.current) )
          cell.addClassName('today');

        if ( cell.date.between(this.options.earliest, this.options.latest) )
          cell.addClassName('selectable');
        else
          cell.addClassName('unselectable');

        // save a copy of old assigned class attributes for later use
        cell.classDefault = cell.readAttribute('class');

        current.addDays(1);
      }.bind(this));

      start.addMonths(1);
    }

    // finally, draw selection
    this.refreshSelectionRange(this.selection.start, this.selection.end);
  },

  registerEventObservers: function() {
    var el;

    // main display
    this.display.observe('click', this.toggleRangeSelector.bind(this));

    // calendar buttons (prev, next, today)
    if ( el = $('calendars_controls').down('.calendar_button.prev') )
      el.observe('click', this.onCalendarButtonClick.bind(this));

    if ( el = $('calendars_controls').down('.calendar_button.next') )
      el.observe('click', this.onCalendarButtonClick.bind(this));

    if ( el = $('calendars_controls').down('.calendar_button.today') )
      el.observe('click', this.onCalendarButtonClick.bind(this));

    // calendar (cell clicks, onmouseover)
    $$('#calendars_container td').each(function(day) {
      day.observe('click', this.onDayCellClick.bind(this));
      day.observe('mouseover', this.onDayCellMouseOver.bind(this));
    }.bind(this));

    // accept/cancel
    this.rangeControls.okButton.observe('click', this.onAcceptClick.bind(this));
    this.rangeControls.cancelButton.observe('click', this.onCancelClick.bind(this));
    // date range inputs
    this.rangeControls.start.observe('blur', this.onRangeFieldBlur.bind(this));
    this.rangeControls.end.observe('blur', this.onRangeFieldBlur.bind(this));
    new Form.Element.Observer(this.rangeControls.start, 0.2, this.onRangeFieldChange.bind(this));
    new Form.Element.Observer(this.rangeControls.end, 0.2, this.onRangeFieldChange.bind(this));
  },

  /////////////////////////////////////////////////////////////////////////////
  // Event handlers
  /////////////////////////////////////////////////////////////////////////////

  onCalendarButtonClick: function(e) {
    e.stop();
    
    var el = e.findElement('.calendar_button');
    if ( el ) {
      if ( el.hasClassName('prev') ) {
        this.date.add({months: -1});
      } else if ( el.hasClassName('next') ) {
        this.date.add({months: 1});
      } else {
        this.date = this.options.current.clone();
      }
      this.fill();
    }
    
    return false;
  },

  onDayCellClick: function(e) {
    e.stop();
    
    var day = Event.element(e);

    if ( !this.selecting && !day.hasClassName('unselectable') ) {
      // set the selection pin (selection pin is date of the first click when 
      // selecting a range)
      this.selection.pin = day.date.clone();

      // first, range starts and ends on the clicked date
      this.selection.start = day.date.clone();
      this.selection.end = day.date.clone();

      // mark cell as selected
      this.selectDayCell(day);

      // draw selection
      this.refreshSelectionRange(this.selection.start, this.selection.end);
    }
    this.selecting = !this.selecting;
    
    return false;
  },

  onDayCellMouseOver: function(e) {
    // exit if we are not performing a date range selection
    if ( !this.selecting ) return;

    // which cell are we over?
    var dayOver = Event.element(e);

    // update range selection    
    this.refreshSelectionRange(this.selection.pin, dayOver.date);
  },

  onRangeFieldChange: function(element, value) {
    if ( this.selecting ) return;

    if ( !Date.parse(value) ) {
      element.addClassName('error');
      Effect.Shake(element, {distance: 2, duration: 0.2, afterFinish: function() { element.focus(); }});
    } else element.removeClassName('error');

    if ( !this.isValidRange() ) {
      this.rangeControls.errorMessage.update(this.locale.captions.invalidRangeMessage);
      if ( this.options.useEffects )
        Effect.Appear(this.rangeControls.errorMessage, {duration: 0.3});
      else
        this.rangeControls.errorMessage.show();
      this.rangeControls.okButton.disable();
    } else {
      if ( this.options.useEffects )
        Effect.Fade(this.rangeControls.errorMessage, {duration: 0.3});
      else
        this.rangeControls.errorMessage.hide();
      this.rangeControls.okButton.enable();
    }
  },

  onRangeFieldBlur: function(e) {
    if ( this.isValidRange() ) {
      this.selection.start = Date.parse(this.rangeControls.start.value.strip());
      this.selection.end = Date.parse(this.rangeControls.end.value.strip());
      this.refreshSelectionRange(this.selection.start, this.selection.end);
    }
  },

  onAcceptClick: function(e) {
    if ( e ) e.stop();
    
    // update range from selection
    this.range.start = this.selection.start.clone();
    this.range.end = this.selection.end.clone();

    // update main display
    var newRangeDisplay = this.rangeToDisplayString();
    this.display.update(newRangeDisplay).writeAttribute('title', newRangeDisplay.replace('&ndash;', '-'));

    // hide date range selector
    this.toggleRangeSelector();

    // dispatch onRangeChange() callback if present
    if ( this.options.onRangeChange )
      this.options.onRangeChange();      

    if ( this.options.useEffects )
      new Effect.Highlight(this.display, {duration: 0.5});
      
    return false;
  },

  onCancelClick: function(e) {
    if ( e ) e.stop();
    
    // hide date range selector
    this.toggleRangeSelector();

    // undo
    this.selection.start = this.range.start.clone();
    this.selection.end = this.range.end.clone();
    this.selection.pin = null;
    this.refreshSelectionRange(this.selection.start, this.selection.end);

    // just in case it was active...
    this.rangeControls.errorMessage.hide();
    
    return false;
  },

  toggleRangeSelector: function(e) {
    if ( e ) e.stop();
    
    var dropdown = $('rangepicker_display').down('.dropdown');
    dropdown.toggleClassName('up');

    var calendarSelector = $('rangepicker_calendars');

    if ( !this.options.useEffects )
      calendarSelector.toggle();
    else
      Effect.toggle(calendarSelector,'blind', {duration: 0.5});
      
    return false;
  },

  isValidRange: function() {
    var newRangeStart = Date.parse(this.rangeControls.start.value.strip());
    var newRangeEnd = Date.parse(this.rangeControls.end.value.strip());

    if ( !newRangeStart || !newRangeEnd )
      return false;

    if ( newRangeStart.isAfter(newRangeEnd) || newRangeEnd.isBefore(newRangeStart) )
      return false;

    if ( newRangeStart.isBefore(this.options.earliest) || newRangeEnd.isAfter(this.options.latest) )
      return false;

    return true;
  },

  selectDayCell: function(cell) {
    if ( !cell.hasClassName('unselectable') ) {
      if ( cell.hasClassName('beyond') )
        cell.addClassName('beyond_selected');
      else
        cell.addClassName('selected');
    }
  },

  refreshSelectionRange: function(start, end) {
    if ( !start || !end ) return;

    this.element.select('#calendars_container td').each(function(day) {
      day.writeAttribute('class',day.classDefault);

      if ( typeof day.date == 'undefined' ) return;

      if ( day.date.between(start, end) || day.date.between(end, start) )
        this.selectDayCell(day);
    }.bind(this));

    var selectedDays = this.element.select('#calendars_container td.selected');
    if ( selectedDays.length >= 1 ) {
      var dayStart = selectedDays.first();
      var dayEnd = selectedDays.last();

      if ( dayStart.date.equals(dayEnd.date) )
        dayStart.addClassName('startendrange').removeClassName('startrange').removeClassName('endrange');
      else {
        dayStart.addClassName('startrange');
        dayEnd.addClassName('endrange');
      }

      this.selection.start = dayStart.date.clone();
      this.selection.end = dayEnd.date.clone();

      this.rangeControls.start.value = this.selection.start.toString(this.locale.date.format);
      this.rangeControls.end.value = this.selection.end.toString(this.locale.date.format);

      this.onRangeFieldChange(this.rangeControls.start, this.rangeControls.start.value);
    }
  },

  rangeToDisplayString: function() {
    return [
      this.range.start.toString(this.locale.date.displayFormat),
      this.range.end.toString(this.locale.date.displayFormat)
    ].join(' &ndash; ');
  }
});

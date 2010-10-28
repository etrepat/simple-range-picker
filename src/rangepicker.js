
if ( typeof Prototype == 'undefined' || parseFloat(Prototype.Version.substring(0, 3)) < 1.6 )
  throw('RangePicker necessita de Prototype 1.6 o superior.');

if ( typeof Date.CultureInfo == 'undefined' )
  throw('RangePicker necessita de la llibreria DateJS.');

var RangePickerOptions = {
  // Idioma (locale)
  Locale: {
    // Dates
    date: {
      // format de la data en el display
      displayFormat: 'd MMM yyyy',

      // format de la data (inputs)
      format: Date.CultureInfo.formatPatterns.shortDate,

      // noms dels mesos
      monthNames: Date.CultureInfo.monthNames,

      // noms dels dies
      dayNames: Date.CultureInfo.dayNames,

      // noms dels dies en format curt (depenent de l'idioma pot ser d'una lletra o de dos)
      shortestDayNames: Date.CultureInfo.shortestDayNames,

      // primer dia de la setmana ( generalment: 0 = Diumenge, 1 = Dilluns)
      weekOffset: Date.CultureInfo.firstDayOfWeek
    },

    // Controls
    captions: {
      // accés directe al dia d'avui
      todayShortcutCaption: 'Avui',

      // botó de més anterior
      prevButtonCaption: '&laquo;',

      // botó de mes següent
      nextButtonCaption: '&raquo;',

      // label dels selectors de data
      inputsLabel: 'Rang de dates',

      // text del botó d'acceptar
      okButtonCaption: 'Acceptar',

      // text del botó de cancelar
      cancelButtonCaption: 'Cancelar',

      invalidRangeMessage: 'El rang seleccionat no es vàlid!'
    }
  },

  // Template
  Template: {
    // Principal
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

    // Calendari
    calendar: {
      weekday: '<th scope="col" abbr="#{weekday_abbr}">#{weekday_short_desc}</th>',

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

  // Opcions
  Options: {
    // nombre de mesos que es mostren
    months: 3,

    // posició del més actual (un de: first/last/middle)
    currentMonthPosition: 'last',

    // data actual (referencia),
    current: Date.today(),

    // la data més antiga que es pot seleccionar
    earliest: Date.today().add({years: -1}),

    // la data més llunyana que es pot seleccionar
    latest: Date.today(),

    // events
    onRangeChange: Prototype.emptyFunction(),

    // efectes
    useEffects: typeof Effect != 'undefined'
  }
};

var RangePicker = Class.create({

  version: '0.1',

  initialize: function(element) {
    this.element = $(element);

    if ( !this.element )
      throw('Element de destí inexistent.');

    // Accessos directes
    this.options = Object.extend(RangePickerOptions.Options, arguments[1] || {});
    this.locale = Object.extend(RangePickerOptions.Locale, arguments[2] || {});
    this.template = Object.extend(RangePickerOptions.Template, arguments[3] || {});

    // Rang
    this.options.earliest.clearTime();
    this.options.latest.clearTime().set({hour:23, minute: 59, second: 59});

    this.date = this.options.current.clone();
    this.range = {start: this.date.clone(), end: this.date.clone()};

    // Seleccions en el calendari
    this.selecting = false;
    this.selection = {start: this.range.start.clone(), end: this.range.end.clone(), pin: null};

    // Construim el DOM
    this.build();
    this.fill();

    // Events
    this.registerEventObservers();
  },

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
    this.rangeControls = {start: $('inici'), end: $('fi'), errorMessage: $('range_error_description'), okButton: $('acceptar'), cancelButton: $('cancelar')};
  },

  /*
    TODO Aquesta funció es força pesada, pensar com millorarla i executarla més eficientment...
  */
  fill: function() {
    // Calculem la data d'inici on hem de començar
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

    // Per a cada més emplenem els dies corresponents...
    for (var i=0, m=this.options.months; i < m; ++i) {
      var calendar = $('calendar_' + i);
      var caption = calendar.down('caption');
      // Nom del més en l'idioma corresponent
      caption.update(this.locale.date.monthNames[start.getMonth()] + ' ' + start.getFullYear());

      var current = start.clone().moveToFirstDayOfMonth();
      // 1er dia del més actual
      var firstDay = current.clone();
      // ultima dia del mes actual
      var lastDay = firstDay.clone().moveToLastDayOfMonth();
      // movem la data al primer dilluns (si cal) de la setmana del primer dia de mes i aquesta es la data de partida...
      if (current.getDay() != 1) { // si no som a dilluns tirem enrere
        current = current.moveToDayOfWeek(1, -1);
      }

      // Emplenemt les cel.les
      calendar.select('td').each(function(cell) {
        cell.date = current.clone();
        cell.update(current.getDate());
        cell.writeAttribute('class', ''); // esborrem  primer (per a pasades posteriors)

        // afegim les clases necesaries
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

        // ens guardem una copia de les clases assignades per a operacions posteriors
        cell.classDefault = cell.readAttribute('class');

        current.addDays(1);
      }.bind(this));

      start.addMonths(1);
    }

    // Dibuixem la sel.lecció
    this.refreshSelectionRange(this.selection.start, this.selection.end);
  },

  registerEventObservers: function() {
    var el;

    // Display
    this.display.observe('click', this.toggleRangeSelector.bind(this));

    // Botons del calendari (anterior, següent, avui)
    if ( el = $('calendars_controls').down('.calendar_button.prev') )
      el.observe('click', this.onCalendarButtonClick.bind(this));

    if ( el = $('calendars_controls').down('.calendar_button.next') )
      el.observe('click', this.onCalendarButtonClick.bind(this));

    if ( el = $('calendars_controls').down('.calendar_button.today') )
      el.observe('click', this.onCalendarButtonClick.bind(this));

    // Calendari
    $$('#calendars_container td').each(function(day) {
      day.observe('click', this.onDayCellClick.bind(this));
      day.observe('mouseover', this.onDayCellMouseOver.bind(this));
    }.bind(this));

    // Controls
    // Botons d'acceptar i cancel.lar
    this.rangeControls.okButton.observe('click', this.onAcceptClick.bind(this));
    this.rangeControls.cancelButton.observe('click', this.onCancelClick.bind(this));
    // Inputs de data (rang)
    this.rangeControls.start.observe('blur', this.onRangeFieldBlur.bind(this));
    this.rangeControls.end.observe('blur', this.onRangeFieldBlur.bind(this));
    new Form.Element.Observer(this.rangeControls.start, 0.2, this.onRangeFieldChange.bind(this));
    new Form.Element.Observer(this.rangeControls.end, 0.2, this.onRangeFieldChange.bind(this));
  },

  // Events

  onCalendarButtonClick: function(e) {
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
  },

  onDayCellClick: function(e) {
    var day = Event.element(e);

    if ( !this.selecting && !day.hasClassName('unselectable') ) {
      // establim el pin (primer click d'una selecció de rang)
      this.selection.pin = day.date.clone();

      // el rang comença i acaba amb la data on hem fet click
      this.selection.start = day.date.clone();
      this.selection.end = day.date.clone();

      // seleccionem la cel.la
      this.selectDayCell(day);

      // actualitzem la visualització del rang seleccionat
      this.refreshSelectionRange(this.selection.start, this.selection.end);
    }
    this.selecting = !this.selecting;
  },

  onDayCellMouseOver: function(e) {
    // si no hem fet click previament (no estem seleccionant), fora
    if ( !this.selecting ) return;

    // cel.la per on ens estem movent
    var dayOver = Event.element(e);

    // actualitzem el rang a les dates compreses entre la data del primer click i la que ens movem
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
    // Actualitzem el rang a partir de la selecció realitzada
    this.range.start = this.selection.start.clone();
    this.range.end = this.selection.end.clone();

    // Actualitzem el display
    var newRangeDisplay = this.rangeToDisplayString();
    this.display.update(newRangeDisplay).writeAttribute('title', newRangeDisplay.replace('&ndash;', '-'));

    // Amaguem el selector de rangs de dates
    this.toggleRangeSelector();

    // dispatch onRangeChange() callback if present (by solomongaby)
    if ( this.options.onRangeChange )
      this.options.onRangeChange();

    if ( this.options.useEffects )
      new Effect.Highlight(this.display, {duration: 0.5});
  },

  onCancelClick: function(e) {
    // Amaguem el selector de rangs de dates
    this.toggleRangeSelector();

    // desfem
    this.selection.start = this.range.start.clone();
    this.selection.end = this.range.end.clone();
    this.selection.pin = null;
    this.refreshSelectionRange(this.selection.start, this.selection.end);

    // per si estava actiu...
    this.rangeControls.errorMessage.hide();
  },

  toggleRangeSelector: function() {
    var dropdown = $('rangepicker_display').down('.dropdown');
    dropdown.toggleClassName('up');

    var calendarSelector = $('rangepicker_calendars');

    if ( !this.options.useEffects )
      calendarSelector.toggle();
    else
      Effect.toggle(calendarSelector,'blind', {duration: 0.5});
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
    return new String(this.range.start.toString(this.locale.date.displayFormat) + ' &ndash; ' + this.range.end.toString(this.locale.date.displayFormat));
  }
});


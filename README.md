# Simple Range Picker

Simple javascript date range picker component I made some time ago for my own
projects and self-testing/learning.

Inspiration for this component came from the Flash-based date range picker you
can see on *Google Analytics* and [Stephen Celis's](http://stephencelis.com/) [Timeframe](http://stephencelis.github.com/timeframe) component.

## Usage

    new RangePicker(element[, options, locale, template]);

### `options` parameter

- `months`: number of calendar months showing at once (default: `3`).
- `currentMonthPosition`: position of current month. one of: `first`, `last` or
`middle`. (default: `last`).
- `current`: current date. (default: 'Date.today()').
- `initialSelectionStart`: initial selection range start date (default: 'Date.today()')
- `initialSelectionEnd`: initial selection range end date (default: 'Date.today()')
- `earliest`, `latest`: The earliest and latest selectable dates. (default: `earliest`)
- `onRangeChange`: callback fired when range selection changes

### `locale` and `template` parameters

- `locale`: Allows for simple runtime locale manipulation (component-specific or date manipulation).
- `template`: Sets the markup which *RangePicker* will use to generate the
calendar component.

Please take a look at the `RangePickerOptions` object on `rangepicker.js` for further
details on the options avaible on both objects.

## Quick & Dirty

    <script type="text/javascript" charset="utf-8">
        new RangePicker('rangepicker', {
            months: 3,
            currentMonthPosition: 'last'
        });
    </script>

You can see it in action online [here](http://etrepat.github.com/simple-range-picker/)
or take a look at the `example` folder.

## Dependencies

*RangePicker* depends on the following libraries:

- [Prototype](http://prototypejs.org) 1.6 or higher
- [Datejs](http://code.google.com/p/datejs/) 1.0 Alpha-1 or higher
- (*optional*) [Script.aculo.us](http://script.aculo.us/) 1.8.0 o higher (If present, some effects are used)

Notes:

- All dependencies are bundled on the `lib` directory at what version they
were when this component was written.

## Localization

Localization can be accomplished by modifying the strings present in `RangePickerOptions.Locale`
object. Also, as this project relies on the [Datejs](http://code.google.com/p/datejs/) library for
date manipulation, dropping a localized *culture info file* will do the job for date formats, day names, etc.

---

Coded by Estanislau Trepat, released under the [MIT License](http://www.opensource.org/licenses/mit-license.php).


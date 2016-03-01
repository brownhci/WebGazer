/* global WebInspector Runtime WorkerRuntime Protocol */

// stub out a few APIs
global.self = global
global.window = global
global.WebInspector = {}
global.Runtime = {}
global.TreeElement = {}
global.WorkerRuntime = {}
global.Protocol = {}
var noop = function () {}
WorkerRuntime.Worker = noop
WebInspector.targetManager = {}
WebInspector.targetManager.observeTargets = noop
WebInspector.settings = {}
WebInspector.settings.createSetting = noop
WebInspector.console = {}
WebInspector.console.error = noop
WebInspector.moduleSetting = function () { return { get: noop } }
WebInspector.DeferredLayerTree = {}
WebInspector.VBox = noop
WebInspector.HBox = noop
WebInspector.SortableDataGridNode = {}
WebInspector.UIString = (str) => str
Protocol.Agents = {}
Runtime.experiments = {}
Runtime.experiments.isEnabled = (exp) => exp === 'timelineLatencyInfo' // turn this on

// Pull in the devtools frontend
//    We need to barely rewrite just two of these files.
var hook = require('node-hook')
//    Expose any function declarations as assignments to the global obj
hook.hook('.js', source => source.replace(/\nfunction\s(\S+)\(/g, '\n$1 = function('))
require('chrome-devtools-frontend/front_end/common/Object.js')
require('chrome-devtools-frontend/front_end/platform/utilities.js')
require('chrome-devtools-frontend/front_end/sdk/Target.js')
hook.unhook('.js')
//    Pull in the rest, unmodified
require('chrome-devtools-frontend/front_end/bindings/TempFile.js')
require('chrome-devtools-frontend/front_end/sdk/TracingModel.js')
require('chrome-devtools-frontend/front_end/timeline/TimelineJSProfile.js')
require('chrome-devtools-frontend/front_end/timeline/TimelineUIUtils.js')
require('chrome-devtools-frontend/front_end/sdk/CPUProfileDataModel.js')
require('chrome-devtools-frontend/front_end/timeline/LayerTreeModel.js')
require('chrome-devtools-frontend/front_end/timeline/TimelineModel.js')
require('chrome-devtools-frontend/front_end/components_lazy/FilmStripModel.js')
require('chrome-devtools-frontend/front_end/timeline/TimelineIRModel.js')
require('chrome-devtools-frontend/front_end/timeline/TimelineFrameModel.js')

function traceToTimelineModel (events) {
  // (devtools) tracing model
  var tracingModelBackingStorage = new WebInspector.TempFileBackingStorage('tracing')
  var tracingModel = new WebInspector.TracingModel(tracingModelBackingStorage)

  // timeline model
  var timelineModel = new WebInspector.TimelineModel(tracingModel, WebInspector.TimelineUIUtils.visibleEventsFilter())
  timelineModel.setEventsForTest(typeof events === 'string' ? JSON.parse(events) : events)

  // tree views (bottom up & top down)
  // they are too mixed up with the view. can't do right now.
  //      require('./timeline/TimelineTreeView.js')
  //      var treeViewContext = { element: { classList : { add: noop } } }
  //      var boundBottomUp = WebInspector.BottomUpTimelineTreeView.bind(treeViewContext, timelineModel)
  //      var bottomUpTree = new boundBottomUp()

  // frame model
  var frameModel = new WebInspector.TracingTimelineFrameModel()
  frameModel.addTraceEvents({ /* target */ }, timelineModel.inspectedTargetEvents(), timelineModel.sessionId() || '')

  var filmStripModel = new WebInspector.FilmStripModel(tracingModel)

  // interaction model
  var irModel = new WebInspector.TimelineIRModel()
  irModel.populate(timelineModel)

  return {
    timelineModel: timelineModel,
    irModel: irModel,
    frameModel: frameModel,
    filmStripModel: filmStripModel
  }
}

module.exports = traceToTimelineModel

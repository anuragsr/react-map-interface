/* eslint-disable no-script-url */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { Component } from "react";
import $ from "jquery";
import GoogleMapReact from "google-map-react";
import Switch from "react-switch";
import {
  l,
  cl,
  auth,
  generateColor,
  sp,
  rand,
  randBetween,
  coords,
  currentCenter
} from "../helpers/common";

import SearchBox from "./SearchBox";
import AutoComplete from "./AutoComplete";
import HttpService from "../services/HttpService";

import mapStyles from "../data/wb_color_for_influence_map.json";

const InfluenceBox = ({ text, onResetInfluence }) => (
    <div className="ctn-influence">
      {text} <img onClick={onResetInfluence} src="assets/refresh.png" alt="" />
    </div>
  ),
  hex2rgba = (hex, alpha = 1) => {
    const [r, g, b] = hex.match(/\w\w/g).map(x => parseInt(x, 16));
    return `rgba(${r},${g},${b},${alpha})`;
  },
  checkDuplicate = (items, item) => {
    return !!items.filter(t => t.id === item.id).length;
  },
  findShapeGroupById = (shapes, id) => {
    let result = shapes.filter(t => t.shapeId === id),
      len = result.length;
    return len ? result[0] : len;
  },
  radians = n => n * (Math.PI / 180),
  degrees = n => n * (180 / Math.PI),
  getBearing = (start, end) => {
    let startLat = radians(start.lat()),
      startLong = radians(start.lng()),
      endLat = radians(end.lat()),
      endLong = radians(end.lng()),
      dLong = endLong - startLong,
      dPhi = Math.log(
        Math.tan(endLat / 2.0 + Math.PI / 4.0) /
          Math.tan(startLat / 2.0 + Math.PI / 4.0)
      );

    if (Math.abs(dLong) > Math.PI) {
      if (dLong > 0.0) dLong = -(2.0 * Math.PI - dLong);
      else dLong = 2.0 * Math.PI + dLong;
    }

    return (degrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
  };

let palette = [
    { color: "#56d86c", tagId: null },
    { color: "#5f2700", tagId: null },
    { color: "#294eea", tagId: null },
    { color: "#ffb478", tagId: null },
    { color: "#ea5343", tagId: null },
    { color: "#ffe682", tagId: null },
    { color: "#dd2c28", tagId: null },
    { color: "#156bff", tagId: null },
    { color: "#fc9e2d", tagId: null },
    { color: "#b36235", tagId: null },
    { color: "#fb7c2c", tagId: null },
    { color: "#306f3c", tagId: null },
    { color: "#ffd200", tagId: null },
    { color: "#5f274f", tagId: null },
    { color: "#3bbd63", tagId: null },
    { color: "#b2388f", tagId: null },
    { color: "#fbadd9", tagId: null },
    { color: "#8b250a", tagId: null },
    { color: "#7e420a", tagId: null },
    { color: "#3999ff", tagId: null }
  ],
  createArray = [],
  updateArray = [],
  deleteArray = [],
  submitTimer,
  undoRedoObj = { action: "", clicked: false, interval: 0 },
  setNewPath = () => {},
  polyOuterListener = () => {},
  vertexObj = { vertex: 0, selected: false, marker: {} },
  resetVertexObj = () => {
    vertexObj.marker.setMap(null);
    vertexObj.selected = false;
  };

export default class MapComponent extends Component {
  constructor(props) {
    super(props);
    this.searchtags = React.createRef();
    this.drawshapes = React.createRef();
    this.undobtns = React.createRef();
    this.searchplaces = React.createRef();
    this.savebtn = React.createRef();

    this.http = new HttpService();
    this.state = {
      name: "Yul5ia",
      username: "supervisor@mail.ru",
      sidebarHidden: false,
      mapsApiLoaded: false,
      mapInstance: null,
      mapsApi: null,
      currentTag: null,
      currentShape: null,
      tags: [],
      canDraw: false,
      showNotif: false,
      notifType: "success",
      show: false,
      undoRedo: { enabled: false, type: "undo", time: 10 }
    };
  }

  static defaultProps = {
    center: { lat: 40.78343, lng: -73.96625 },
    zoom: 15,
    influence: 1
  };

  componentDidMount() {
    // l(mapStyles)
    currentCenter.coordinates = [-73.96625, 40.78343];
  }

  toggleSidebar = () => {
    let { sidebarHidden } = this.state;
    sidebarHidden = !sidebarHidden;
    this.setState({ sidebarHidden });
  };

  logout = () => this.props.logout();

  apiLoaded = (map, maps) => {
    // Adding controls
    map.controls[maps.ControlPosition.LEFT_TOP].push(this.searchtags.current);
    map.controls[maps.ControlPosition.LEFT_TOP].push(this.drawshapes.current);

    this.savebtn.current.index = -1;
    map.controls[maps.ControlPosition.RIGHT_TOP].push(
      this.searchplaces.current
    );
    map.controls[maps.ControlPosition.RIGHT_BOTTOM].push(this.savebtn.current);

    // Undo buttons
    map.controls[maps.ControlPosition.TOP_CENTER].push(this.undobtns.current);

    // Adding methods to google maps namespace object prototypes
    maps.Rectangle.prototype.getCenter = function() {
      return this.getBounds().getCenter();
    };
    maps.Rectangle.prototype.getTopRight = function() {
      return this.getBounds().getNorthEast();
    };

    maps.Polygon.prototype.getCenter = function() {
      let arr = this.getPath().getArray(),
        distX = 0,
        distY = 0,
        len = arr.length;

      arr.forEach(element => {
        distX += element.lat();
        distY += element.lng();
      });

      return new maps.LatLng(distX / len, distY / len);
    };
    maps.Polygon.prototype.getBounds = function() {
      let bounds = new maps.LatLngBounds();
      this.getPath().forEach(element => bounds.extend(element));
      return bounds;
    };
    maps.Polygon.prototype.getTopRight = function() {
      return this.getBounds().getNorthEast();
    };

    maps.Circle.prototype.getTopRight = function() {
      return this.getBounds().getNorthEast();
    };

    maps.event.addDomListener(document, "keyup", e => {
      if (e.target.tagName !== "INPUT") {
        const key = e.keyCode ? e.keyCode : e.which;
        let { currentTag } = this.state;
        // l(key)
        if (currentTag) {
          switch (key) {
            case 8:
              let selected = currentTag.shapes.filter(s => s.selected),
                currentShape;
              if (selected.length) {
                currentShape = selected[0];

                // Check if it is a polygon, whether a vertex is selected
                if (currentShape.type === "polygon" && vertexObj.selected) {
                  // l("delete vertex", vertexObj.vertex)
                  let arr = currentShape.shape.getPath().getArray();
                  arr.splice(vertexObj.vertex, 1);
                  // coords(arr)

                  // This added so that the listeners are added as well
                  undoRedoObj.action = "vertex_removed";
                  undoRedoObj.clicked = true;

                  this.setState(
                    {
                      currentTag,
                      currentShape,
                      undoRedo: { enabled: true, time: 10, type: "undo" } // "redo" / "undo"
                    },
                    this.undoRedoTimer
                  );

                  // l("prev")
                  // coords(currentShape.undoRedo.shape.path.prev)
                  // l("curr")
                  // coords(arr)

                  currentShape.shape.setPath(arr);
                  setNewPath();
                } else this.prepareShapeToDelete(currentShape, currentTag);
              } else this.tagDeleted(currentTag);

              break;

            default:
              break;
          }
        }
      }
    });

    // Adding drawing options
    const dm = new maps.drawing.DrawingManager({ map, drawingControl: false });
    maps.event.addListener(dm, "polygoncomplete", shape =>
      this.addShapeAndEventHandlers(shape, "polygon", "draw")
    );
    maps.event.addListener(dm, "circlecomplete", shape =>
      this.addShapeAndEventHandlers(shape, "circle", "draw")
    );
    maps.event.addListener(dm, "rectanglecomplete", shape =>
      this.addShapeAndEventHandlers(shape, "rectangle", "draw")
    );

    // Change center when dragged
    map.addListener("center_changed", e => {
      const location = map.getCenter();
      currentCenter.coordinates = [location.lng(), location.lat()];
    });

    this.setState({
      mapsApiLoaded: true,
      mapInstance: map,
      mapsApi: maps,
      drawingManager: dm
    });

    // For deleting vertices on a polygon
    vertexObj.marker = new this.state.mapsApi.Circle({
      radius: 50,
      strokeColor: "#000000",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#000000",
      fillOpacity: 0.35,
      suppressUndo: true,
      zIndex: 0
    });
  };

  prepareShapeToDelete = (selectedShape, currentTag) => {
    // Remove current shape from map
    selectedShape.shape.setMap(null);
    selectedShape.outer.setMap(null);
    resetVertexObj();

    // Remove current shape from tag
    currentTag.shapes = currentTag.shapes.filter(
      s => s.shapeId !== selectedShape.shapeId
    );

    this.setState(
      {
        currentTag,
        undoRedo: { enabled: false, type: "undo" }
      },
      () => {
        // Add to delete array for deletion
        if (selectedShape.id) {
          deleteArray.push({ tagId: currentTag.id, id: selectedShape.id });
          updateArray = updateArray.filter(t => t.id !== selectedShape.id);
          // l(deleteArray)
        } else {
          createArray = createArray.filter(t => t.id !== selectedShape.id);
        }
      }
    );
  };

  shapeSelected = shape => {
    if (
      this.state.currentShape &&
      shape.shapeId !== this.state.currentShape.shapeId
    ) {
      resetVertexObj();
    }

    let { currentTag, mapInstance } = this.state,
      currentShape = findShapeGroupById(currentTag.shapes, shape.shapeId);

    currentTag.shapes.forEach(s => {
      s.selected = false;
      s.outer.setOptions({ map: null, editable: false });
      s.shape.setEditable(false);
    });

    currentShape.selected = true;
    currentShape.shape.setEditable(true);
    currentShape.outer.setOptions({ map: mapInstance, editable: true });
    this.setState({ currentTag, currentShape });
  };

  addShapeAndEventHandlers = (shape, type, method, area, currentTag) => {
    this.setState({ undoRedo: { enabled: false, type: "undo" } });
    if (method === "draw") currentTag = this.state.currentTag;

    let { mapsApi, mapInstance, drawingManager } = this.state,
      sph = mapsApi.geometry.spherical,
      shapeId = rand(8),
      polyEventType = null,
      circEventType = null,
      rectEventType = null,
      isDragging = false,
      outer,
      outerShapeProps = {
        strokeColor: currentTag.color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: currentTag.color,
        fillOpacity: 0.35,
        suppressUndo: true,
        zIndex: 0
      },
      shapeObj = {},
      inf_poly,
      undoRedo = { shape: {}, outer: {} }; // undo / redo

    if (method === "fetch") inf_poly = area.influence_polygon;
    // l(currentTag.id, this.state.currentTag.id)

    drawingManager.setDrawingMode(null);
    shape.shapeId = shapeId;
    shape.addListener("click", () => this.shapeSelected(shape));
    shape.addListener("drag", () => this.shapeSelected(shape));

    switch (type) {
      case "polygon":
        // Detect if clicked using editable points
        shape.addListener("mousedown", evt => {
          // this.shapeSelected(shape)
          let currentShape = findShapeGroupById(
            currentTag.shapes,
            shape.shapeId
          );
          // l(evt, currentShape.shape)

          if (
            typeof evt.vertex !== "undefined" &&
            currentShape.type === "polygon"
          ) {
            // l(evt.latLng.lat(), evt.latLng.lng())

            let arr = currentShape.shape.getPath().getArray();
            if (arr.length > 3) {
              vertexObj.vertex = evt.vertex;
              vertexObj.selected = true;
              vertexObj.marker.setOptions({
                center: evt.latLng,
                map: mapInstance,
                strokeColor: currentTag.color,
                fillColor: currentTag.color
              });

              // arr.forEach(el  => {
              //   l("lat:", el.lat(), "lng:", el.lng())
              // })
            }
          }

          // l(evt)
          if (typeof evt.vertex !== "undefined" || evt.edge) {
            // For editable points on vertices or midpoints on edges
            currentShape.undoRedo.shape.path.prev = [
              ...currentShape.undoRedo.shape.path.curr
            ];
          }
        });

        // 'dragstart' used because it fires once, and bounds_changed fires continuously
        shape.addListener("dragstart", () => {
          isDragging = true;
          // l("set drag start", isDragging)

          let currentShape = findShapeGroupById(
            currentTag.shapes,
            shape.shapeId
          );
          // capturing prev path when dragging starts
          currentShape.undoRedo.shape.path.prev = [
            ...currentShape.undoRedo.shape.path.curr
          ];
          // l("prev lat 0",  currentShape.undoRedo.shape.path.prev[0].lat(), "curr lat 0", currentShape.undoRedo.shape.path.curr[0].lat())

          this.setState(
            {
              undoRedo: { enabled: true, type: "undo", time: 10 }
            },
            this.undoRedoTimer
          );
        });

        shape.addListener("dragend", () => {
          isDragging = false;
          // l("set drag stop", isDragging)

          let currentShape = findShapeGroupById(
            currentTag.shapes,
            shape.shapeId
          );
          // capturing end path when dragging stops
          currentShape.undoRedo.shape.path.curr = currentShape.shape
            .getPath()
            .getArray();
          // l("prev lat 0",  currentShape.undoRedo.shape.path.prev[0].lat(), "curr lat 0", currentShape.undoRedo.shape.path.curr[0].lat())
        });

        // Outer shape for polygon
        outer = new mapsApi.Polygon({ ...outerShapeProps });
        outer.addListener("mousedown", evt => {
          // l(evt)
          if (evt.vertex) {
            // For editable points on vertices
            let currentShape = findShapeGroupById(
              currentTag.shapes,
              shape.shapeId
            );
            currentShape.undoRedo.outer.path.prev = [
              ...currentShape.undoRedo.outer.path.curr
            ];
          }
        });

        setNewPath = () => {
          // l('setNewPath, polyEventType', polyEventType)
          let currentShape = findShapeGroupById(
            currentTag.shapes,
            outer.shapeId
          );

          if (undoRedoObj.clicked) {
            undoRedoObj.clicked = false;

            if (!vertexObj.selected) {
              // Only if a vertex has not been deleted
              // swap curr and prev position
              currentShape.undoRedo.shape.path.prev = [
                ...currentShape.undoRedo.shape.path.curr
              ];
              currentShape.undoRedo.shape.path.curr = currentShape.shape
                .getPath()
                .getArray();
            }

            shape.getPath().addListener("set_at", () => {
              polyInnerListener("vertexChanged");
            });
            shape.getPath().addListener("insert_at", () => {
              polyInnerListener("vertexAdded");
            });
          } else if (!isDragging) {
            // Because while dragging, this event is continuously emitteed
            this.setState(
              {
                undoRedo: { enabled: true, type: "undo", time: 10 }
              },
              this.undoRedoTimer
            );

            // setting prev (below) is done in the undo / redo handler
            // currentShape.undoRedo.shape.path.prev = [...currentShape.undoRedo.shape.path.curr]
            currentShape.undoRedo.shape.path.curr = currentShape.shape
              .getPath()
              .getArray();
            // l("prev lat 0",  currentShape.undoRedo.shape.path.prev[0].lat(), "curr lat 0", currentShape.undoRedo.shape.path.curr[0].lat())
            // l("prev lat 0",  currentShape.undoRedo.shape.path.prev.length, "curr lat 0", currentShape.undoRedo.shape.path.curr.length)
          }

          // l(currentShape.shape.getPath())
          if (polyEventType === "fromSelf_inner") {
            currentShape.outer.getPath().clear();
            currentShape.outer.setMap(null);
          }
          currentShape.outer.setPath(
            currentShape.shape
              .getPath()
              .getArray()
              .map(pt =>
                sph.computeOffset(
                  pt,
                  currentShape.influence,
                  getBearing(currentShape.shape.getCenter(), pt)
                )
              )
          );
          // set new curr position
          currentShape.undoRedo.outer.path.curr = currentShape.outer
            .getPath()
            .getArray();

          if (polyEventType === "fromSelf_inner") {
            // setTimeout(() => {
            //   currentShape.outer.setMap(mapInstance)
            //   mapsApi.event.trigger(currentShape.outer, "click", {})
            // }, 10)
            currentShape.outer.setMap(mapInstance);
            polyEventType = null;
          }

          currentShape.outer.getPath().addListener("set_at", polyOuterListener);
          currentShape.outer
            .getPath()
            .addListener("insert_at", polyOuterListener);
          resetVertexObj();

          currentTag.shapes.forEach(s => (s.selected = false));
          currentShape.selected = true;
          this.setState({ currentTag }, () => {
            if (
              currentShape.id &&
              !checkDuplicate(updateArray, { id: currentShape.id })
            ) {
              updateArray.push({ tagId: currentTag.id, id: currentShape.id });
              // l(updateArray)
            }
          });
        };

        polyOuterListener = () => {
          // l('polyOuterListener, polyEventType', polyEventType)
          let currentShape = findShapeGroupById(
              currentTag.shapes,
              outer.shapeId
            ),
            result = true;

          if (polyEventType === "fromSelf_inner") {
            this.setState({ currentTag });
            return;
          }
          polyEventType = null;
          undoRedoObj.action = "changed_outer";

          this.setState(
            {
              undoRedo: { enabled: true, type: "undo", time: 10 }
            },
            this.undoRedoTimer
          );

          // setting prev (below) is done in the undo / redo handler
          // currentShape.undoRedo.outer.path.prev = [...currentShape.undoRedo.outer.path.curr]
          currentShape.undoRedo.outer.path.curr = currentShape.outer
            .getPath()
            .getArray();
          // l("prev lat 1",  currentShape.undoRedo.outer.path.prev[1].lat(), "curr lat 1", currentShape.undoRedo.outer.path.curr[1].lat())

          // l('Outer vertex moved', currentShape)
          currentShape.outer
            .getPath()
            .getArray()
            .forEach(v => {
              result =
                result &&
                !mapsApi.geometry.poly.containsLocation(v, currentShape.shape);
            });

          if (result) {
            // No outer point inside inner shape
            let max = 0;
            currentShape.shape
              .getPath()
              .getArray()
              .forEach((v, idx) => {
                max = Math.max(
                  max,
                  Math.round(
                    sph.computeDistanceBetween(
                      v,
                      outer.getPath().getArray()[idx]
                    ) / Math.sqrt(2)
                  )
                );
              });
            currentShape.influence = max;
            currentTag.shapes.forEach(s => (s.selected = false));
            currentShape.selected = true;
            this.setState({ currentTag });
          } else {
            // Atleast one outer point inside inner shape, reset to original influence
            currentShape.influence = this.props.influence;
            polyEventType = "fromSelf_inner";
            setNewPath();
          }
        };

        const polyInnerListener = type => {
          polyEventType = type;
          // l('polyInnerListener, polyEventType', polyEventType)
          undoRedoObj.action = "changed_inner";
          setNewPath();
        };

        shape.getPath().addListener("set_at", () => {
          polyInnerListener("vertexChanged");
        });
        shape.getPath().addListener("insert_at", () => {
          polyInnerListener("vertexAdded");
        });

        if (method === "draw") {
          outer.setMap(mapInstance);
          outer.setPath(
            shape
              .getPath()
              .getArray()
              .map(pt =>
                sph.computeOffset(
                  pt,
                  this.props.influence,
                  getBearing(shape.getCenter(), pt)
                )
              )
          );
        } else {
          // Here the correct coords must be used for outer shape
          let coords = inf_poly.geometry.coordinates[0].map(
            p => new mapsApi.LatLng(p[1], p[0])
          );
          outer.setPath(coords);

          // Show the shape if shape added to the currently selected tag
          if (currentTag.id === this.state.currentTag.id) {
            outer.setMap(mapInstance);
          } else {
            outer.setMap(null);
          }
        }

        outer.getPath().addListener("set_at", polyOuterListener);
        outer.getPath().addListener("insert_at", polyOuterListener);

        undoRedo.shape.path = {
          prev: shape.getPath().getArray(),
          curr: shape.getPath().getArray()
        };
        undoRedo.outer.path = {
          prev: outer.getPath().getArray(),
          curr: outer.getPath().getArray()
        };

        break;

      case "circle":
        const setNewShape = currentShape => {
          this.setState({ currentTag }, () => {
            if (
              currentShape.id &&
              !checkDuplicate(updateArray, { id: currentShape.id })
            ) {
              updateArray.push({ tagId: currentTag.id, id: currentShape.id });
              // l(updateArray)
            }
          });
        };

        // Center change listeners
        // 'dragstart' used because it fires once, and center_changed fires continuously
        shape.addListener("dragstart", () => {
          let currentShape = findShapeGroupById(
            currentTag.shapes,
            shape.shapeId
          );

          // capturing prev position when dragging starts
          currentShape.undoRedo.shape.center.prev =
            currentShape.undoRedo.shape.center.curr;
          this.setState(
            {
              undoRedo: { enabled: true, type: "undo", time: 10 }
            },
            this.undoRedoTimer
          );
        });

        shape.addListener("dragend", () => {
          let currentShape = findShapeGroupById(
            currentTag.shapes,
            shape.shapeId
          );

          // capturing end position when dragging stops
          currentShape.undoRedo.shape.center.curr = currentShape.shape.getCenter();
          // l("prev",  currentShape.undoRedo.shape.center.prev.lat(), "curr", currentShape.undoRedo.shape.center.curr.lat())
        });

        shape.addListener("center_changed", () => {
          undoRedoObj.action = "center_changed";
          let currentShape = findShapeGroupById(
            currentTag.shapes,
            shape.shapeId
          );

          if (undoRedoObj.clicked) {
            // l("Via undo/redo", "action: ", undoRedoObj.action)
            undoRedoObj.clicked = false;

            // swap curr and prev position
            currentShape.undoRedo.shape.center.prev =
              currentShape.undoRedo.shape.center.curr;
            currentShape.undoRedo.shape.center.curr = currentShape.shape.getCenter();
            // l("prev lat",  currentShape.undoRedo.shape.center.prev.lat(), "curr lat", currentShape.undoRedo.shape.center.curr.lat())
          }

          currentShape.outer.setCenter(currentShape.shape.getCenter());
          setNewShape(currentShape);
        });

        // Radius change listeners
        shape.addListener("radius_changed", () => {
          undoRedoObj.action = "radius_changed_inner";

          let currentShape = findShapeGroupById(
            currentTag.shapes,
            shape.shapeId
          );
          currentShape.undoRedo.shape.radius.prev =
            currentShape.undoRedo.shape.radius.curr;
          currentShape.undoRedo.shape.radius.curr = currentShape.shape.getRadius();

          // l("prev",  currentShape.undoRedo.shape.radius.prev, "curr", currentShape.undoRedo.shape.radius.curr)

          circEventType = "fromSelf_inner"; // to differentiate between manual and auto radius change of outer shape
          currentShape.outer.setRadius(
            currentShape.shape.getRadius() + currentShape.influence
          );
          this.setState(
            {
              undoRedo: { enabled: true, type: "undo", time: 10 }
            },
            this.undoRedoTimer
          );
          setNewShape(currentShape);
        });

        // Outer shape for circle
        outer = new mapsApi.Circle({ ...outerShapeProps });

        if (method === "draw") {
          outer.setRadius(shape.getRadius() + this.props.influence);
          outer.setCenter(shape.getCenter());
          outer.setMap(mapInstance);
        } else {
          // Here the correct coords must be used for outer shape
          // outer.setRadius(shape.getRadius() + inf_poly.properties.influence_radius)
          outer.setRadius(inf_poly.properties.influence_radius);
          outer.setCenter(
            new mapsApi.LatLng(
              inf_poly.geometry.coordinates[1],
              inf_poly.geometry.coordinates[0]
            )
          );

          // Show the shape if shape added to the currently selected tag
          if (currentTag.id === this.state.currentTag.id) {
            outer.setMap(mapInstance);
          } else {
            outer.setMap(null);
          }
        }

        // outer.setMap(null)
        outer.addListener("radius_changed", () => {
          if (circEventType !== "fromSelf_inner") {
            undoRedoObj.action = "radius_changed_outer";
            this.setState(
              {
                undoRedo: { enabled: true, type: "undo", time: 10 }
              },
              this.undoRedoTimer
            );
          }
          circEventType = null;

          // Change influence according to new radius
          let currentShape = findShapeGroupById(
            currentTag.shapes,
            outer.shapeId
          );

          currentTag.shapes.forEach(s => (s.selected = false));
          currentShape.selected = true;

          currentShape.undoRedo.outer.radius.prev =
            currentShape.undoRedo.outer.radius.curr;
          currentShape.undoRedo.outer.radius.curr = currentShape.outer.getRadius();

          currentShape.influence = Math.round(
            currentShape.outer.getRadius() - currentShape.shape.getRadius()
          );
          if (currentShape.influence < this.props.influence) {
            currentShape.influence = this.props.influence;
            currentShape.outer.setRadius(
              currentShape.shape.getRadius() + currentShape.influence
            );
          }
          setNewShape(currentShape);
        });

        undoRedo.shape.radius = {
          prev: shape.getRadius(),
          curr: shape.getRadius()
        };
        undoRedo.shape.center = {
          prev: shape.getCenter(),
          curr: shape.getCenter()
        };
        undoRedo.outer.radius = {
          prev: outer.getRadius(),
          curr: outer.getRadius()
        };

        break;

      default:
        // 'dragstart' used because it fires once, and bounds_changed fires continuously
        shape.addListener("dragstart", () => {
          isDragging = true;
          // l("set drag start", isDragging)

          let currentShape = findShapeGroupById(
            currentTag.shapes,
            shape.shapeId
          );

          // capturing prev sw-ne bounds when dragging starts
          currentShape.undoRedo.shape.ne.prev =
            currentShape.undoRedo.shape.ne.curr;
          currentShape.undoRedo.shape.sw.prev =
            currentShape.undoRedo.shape.sw.curr;
          this.setState(
            {
              undoRedo: { enabled: true, type: "undo", time: 10 }
            },
            this.undoRedoTimer
          );
        });

        shape.addListener("dragend", () => {
          isDragging = false;
          // l("set drag stop", isDragging)

          let currentShape = findShapeGroupById(
            currentTag.shapes,
            shape.shapeId
          );

          // capturing end sw-ne bounds when dragging stops
          currentShape.undoRedo.shape.ne.curr = currentShape.shape
            .getBounds()
            .getNorthEast();
          currentShape.undoRedo.shape.sw.curr = currentShape.shape
            .getBounds()
            .getSouthWest();
          // l("prev",  currentShape.undoRedo.shape.center.prev.lat(), "curr", currentShape.undoRedo.shape.center.curr.lat())
        });

        shape.addListener("bounds_changed", () => {
          // l('Bounds changed. dragging:', isDragging)
          undoRedoObj.action = "bounds_changed_inner";

          let currentShape = findShapeGroupById(
            currentTag.shapes,
            shape.shapeId
          );

          if (undoRedoObj.clicked) {
            // l("Via undo/redo", "action: ", undoRedoObj.action)
            undoRedoObj.clicked = false;

            // swap curr and prev position
            currentShape.undoRedo.shape.ne.prev =
              currentShape.undoRedo.shape.ne.curr;
            currentShape.undoRedo.shape.sw.prev =
              currentShape.undoRedo.shape.sw.curr;

            currentShape.undoRedo.shape.ne.curr = currentShape.shape
              .getBounds()
              .getNorthEast();
            currentShape.undoRedo.shape.sw.curr = currentShape.shape
              .getBounds()
              .getSouthWest();
          } else if (!isDragging) {
            // Because while dragging, this event is continuously emitteed
            this.setState(
              {
                undoRedo: { enabled: true, type: "undo", time: 10 }
              },
              this.undoRedoTimer
            );

            currentShape.undoRedo.shape.ne.prev =
              currentShape.undoRedo.shape.ne.curr;
            currentShape.undoRedo.shape.sw.prev =
              currentShape.undoRedo.shape.sw.curr;

            currentShape.undoRedo.shape.ne.curr = currentShape.shape
              .getBounds()
              .getNorthEast();
            currentShape.undoRedo.shape.sw.curr = currentShape.shape
              .getBounds()
              .getSouthWest();
          }

          rectEventType = "from_inner";
          currentShape.outer.setBounds(
            new mapsApi.LatLngBounds(
              sph.computeOffset(
                currentShape.shape.getBounds().getSouthWest(),
                currentShape.influence * Math.sqrt(2),
                225
              ),
              sph.computeOffset(
                currentShape.shape.getBounds().getNorthEast(),
                currentShape.influence * Math.sqrt(2),
                45
              )
            )
          );
        });

        // Outer shape for rectangle
        outer = new mapsApi.Rectangle({ ...outerShapeProps });

        outer.addListener("bounds_changed", () => {
          let currentShape,
            vertices_inner,
            innerBounds,
            inner_ne,
            inner_sw,
            vertices_outer,
            all_vertices_outer,
            outerBounds,
            outer_ne,
            outer_sw,
            result = true;

          // l("Changed outer", rectEventType)
          if (rectEventType !== "init") {
            currentShape = findShapeGroupById(currentTag.shapes, shape.shapeId);
            currentTag.shapes.forEach(s => (s.selected = false));
            currentShape.selected = true;
          }

          switch (rectEventType) {
            case null:
              undoRedoObj.action = "bounds_changed_outer";
              this.setState(
                {
                  undoRedo: { enabled: true, type: "undo", time: 10 }
                },
                this.undoRedoTimer
              );
              break;

            case "init": // Set area first time and return
              outer_ne = outer.getBounds().getNorthEast();
              outer_sw = outer.getBounds().getSouthWest();
              vertices_outer = [
                // Starting from ne
                new mapsApi.LatLng(outer_ne.lat(), outer_ne.lng()),
                new mapsApi.LatLng(outer_sw.lat(), outer_ne.lng()),
                new mapsApi.LatLng(outer_sw.lat(), outer_sw.lng()),
                new mapsApi.LatLng(outer_ne.lat(), outer_sw.lng())
              ];

              outer.area = sph.computeArea(vertices_outer);
              rectEventType = null;
              return;

            case "fromSelf_inner": // Some points inside
            case "fromSelf_drag": // Dragging
              outer_ne = currentShape.outer.getBounds().getNorthEast();
              outer_sw = currentShape.outer.getBounds().getSouthWest();
              vertices_outer = [
                // Starting from ne
                new mapsApi.LatLng(outer_ne.lat(), outer_ne.lng()),
                new mapsApi.LatLng(outer_sw.lat(), outer_ne.lng()),
                new mapsApi.LatLng(outer_sw.lat(), outer_sw.lng()),
                new mapsApi.LatLng(outer_ne.lat(), outer_sw.lng())
              ];

              currentShape.outer.area = sph.computeArea(vertices_outer);
              rectEventType = null;

              // swap prev and curr for undo/redo
              currentShape.undoRedo.outer.ne.prev =
                currentShape.undoRedo.outer.ne.curr;
              currentShape.undoRedo.outer.sw.prev =
                currentShape.undoRedo.outer.sw.curr;
              currentShape.undoRedo.outer.ne.curr = outer_ne;
              currentShape.undoRedo.outer.sw.curr = outer_sw;

              this.setState({ currentTag });

              return;

            default:
              // fromInner
              rectEventType = null;
              this.setState({ currentTag });
              break;
          }

          // Change influence and keep bounds in check here
          innerBounds = currentShape.shape.getBounds();
          inner_ne = innerBounds.getNorthEast();
          inner_sw = innerBounds.getSouthWest();

          outerBounds = currentShape.outer.getBounds();
          outer_ne = outerBounds.getNorthEast();
          outer_sw = outerBounds.getSouthWest();

          vertices_inner = [
            // Starting from ne
            new mapsApi.LatLng(inner_ne.lat(), inner_ne.lng()),
            new mapsApi.LatLng(inner_sw.lat(), inner_ne.lng()),
            new mapsApi.LatLng(inner_sw.lat(), inner_sw.lng()),
            new mapsApi.LatLng(inner_ne.lat(), inner_sw.lng())
          ];

          vertices_outer = [
            // Starting from ne
            new mapsApi.LatLng(outer_ne.lat(), outer_ne.lng()),
            new mapsApi.LatLng(outer_sw.lat(), outer_ne.lng()),
            new mapsApi.LatLng(outer_sw.lat(), outer_sw.lng()),
            new mapsApi.LatLng(outer_ne.lat(), outer_sw.lng())
          ];

          all_vertices_outer = [
            // For the side points as well
            ...vertices_outer,
            new mapsApi.LatLng(
              (outer_ne.lat() + outer_sw.lat()) / 2,
              outer_ne.lng()
            ),
            new mapsApi.LatLng(
              outer_sw.lat(),
              (outer_ne.lng() + outer_sw.lng()) / 2
            ),
            new mapsApi.LatLng(
              (outer_sw.lat() + outer_ne.lat()) / 2,
              outer_sw.lng()
            ),
            new mapsApi.LatLng(
              outer_ne.lat(),
              (outer_sw.lng() + outer_ne.lng()) / 2
            )
          ];

          all_vertices_outer.forEach(v => {
            result = result && !currentShape.shape.getBounds().contains(v);
          });

          if (result) {
            // No outer point inside inner shape
            let new_area = sph.computeArea(vertices_outer),
              old_area = currentShape.outer.area;
            // l(new_area, old_area)
            if (new_area < old_area) {
              // Is the new shape smaller? Then set influence as smallest vertex distance
              let min = Infinity;
              vertices_inner.forEach((v, idx) => {
                min = Math.min(
                  min,
                  Math.round(
                    sph.computeDistanceBetween(v, vertices_outer[idx]) /
                      Math.sqrt(2)
                  )
                );
              });
              currentShape.influence = min;
            } else {
              // Is the new shape bigger? Then set influence as largest vertex distance
              let max = 0;
              vertices_inner.forEach((v, idx) => {
                max = Math.max(
                  max,
                  Math.round(
                    sph.computeDistanceBetween(v, vertices_outer[idx]) /
                      Math.sqrt(2)
                  )
                );
              });
              currentShape.influence = max;
            }
            rectEventType = "fromSelf_drag";
          } else {
            // Atleast one outer point inside inner shape, reset to original influence
            currentShape.influence = this.props.influence;
            rectEventType = "fromSelf_inner";
          }

          if (
            currentShape.id &&
            !checkDuplicate(updateArray, { id: currentShape.id })
          ) {
            updateArray.push({ tagId: currentTag.id, id: currentShape.id });
            // l(updateArray)
          }

          currentShape.outer.setBounds(
            new mapsApi.LatLngBounds(
              sph.computeOffset(
                inner_sw,
                currentShape.influence * Math.sqrt(2),
                225
              ),
              sph.computeOffset(
                inner_ne,
                currentShape.influence * Math.sqrt(2),
                45
              )
            )
          );
        });

        rectEventType = "init";
        if (method === "draw") {
          outer.setMap(mapInstance);
          outer.setBounds(
            new mapsApi.LatLngBounds(
              sph.computeOffset(
                shape.getBounds().getSouthWest(),
                this.props.influence * Math.sqrt(2),
                225
              ),
              sph.computeOffset(
                shape.getBounds().getNorthEast(),
                this.props.influence * Math.sqrt(2),
                45
              )
            )
          );
        } else {
          // Here the correct coords must be used for outer shape
          let bounds = new mapsApi.LatLngBounds();
          inf_poly.geometry.coordinates[0].forEach(p =>
            bounds.extend(new mapsApi.LatLng(p[1], p[0]))
          );
          outer.setBounds(bounds);

          // Show the shape if shape added to the currently selected tag
          if (currentTag.id === this.state.currentTag.id) {
            outer.setMap(mapInstance);
          } else {
            outer.setMap(null);
          }
        }

        undoRedo.shape.ne = {
          prev: shape.getBounds().getNorthEast(),
          curr: shape.getBounds().getNorthEast()
        };
        undoRedo.shape.sw = {
          prev: shape.getBounds().getSouthWest(),
          curr: shape.getBounds().getSouthWest()
        };
        undoRedo.outer.ne = {
          prev: outer.getBounds().getNorthEast(),
          curr: outer.getBounds().getNorthEast()
        };
        undoRedo.outer.sw = {
          prev: outer.getBounds().getSouthWest(),
          curr: outer.getBounds().getSouthWest()
        };

        break;
    }

    outer.shapeId = shapeId;
    outer.setOptions({ map: null, clickable: false });

    currentTag.shapes.forEach(s => {
      s.selected = false;
      s.shape.setOptions({ editable: false });
      s.outer.setOptions({ editable: false, map: null });
    });
    shapeObj = {
      shapeId, // For drawing operations
      type,
      shape,
      outer,
      undoRedo, // Undo / redo
      getInfPos: function() {
        return this.outer.getTopRight();
      }
    };
    if (method === "draw") {
      shapeObj.id = null; // For API operations
      shapeObj.influence = this.props.influence;
      createArray.push({ tagId: currentTag.id, shapeId });
      this.setState({ currentShape: shapeObj }); // so that undo / redo is possible
    } else {
      shapeObj.id = area.id; // For API operations
      shapeObj.influence = this.calculateInfluence(area);
    }
    currentTag.shapes.push(shapeObj);

    if (currentTag.id === this.state.currentTag.id) {
      this.setState({ currentTag });
    } else {
      shapeObj.shape.setMap(null);
    }
  };

  calculateInfluence = area => {
    // l(area)
    let { mapsApi } = this.state,
      inf;

    // Here the correct coords must be used for calculating influence
    switch (area.properties.type) {
      case "circle":
        // inf = area.influence_polygon.properties.influence_radius
        inf = Math.round(
          area.influence_polygon.properties.influence_radius -
            area.properties.radius
        );
        break;

      case "polygon":
      default:
        inf = 0;
        let vertices_inner = area.geometry.coordinates[0],
          vertices_outer = area.influence_polygon.geometry.coordinates[0];

        vertices_inner.forEach((v, idx) => {
          inf = Math.max(
            inf,
            Math.round(
              mapsApi.geometry.spherical.computeDistanceBetween(
                new mapsApi.LatLng(v[1], v[0]),
                new mapsApi.LatLng(
                  vertices_outer[idx][1],
                  vertices_outer[idx][0]
                )
              ) / Math.sqrt(2)
            )
          );
        });
        break;
    }
    return inf;
  };

  tagSelected = currentTag => {
    this.tagDeselected();

    let { tags, mapInstance, drawingManager } = this.state,
      canDraw = true,
      shapeProps = {
        strokeColor: currentTag.color,
        strokeOpacity: 1,
        strokeWeight: 2,
        fillColor: currentTag.color,
        fillOpacity: 0.8,
        clickable: true,
        editable: true,
        suppressUndo: true,
        draggable: true,
        zIndex: 1
      };

    drawingManager.setOptions({
      circleOptions: { ...shapeProps },
      polygonOptions: { ...shapeProps },
      rectangleOptions: { ...shapeProps }
    });

    tags.forEach(t => {
      if (t.id === currentTag.id) {
        t.active = true;
        // t.showInfluenceShape = true
        if (t.shapes.length) {
          // t.shapes[0].selected = true
          t.shapes[0].outer.setOptions({
            // clickable: true,
            // draggable: true,
            // editable: true,
            map: mapInstance
          });
          t.shapes.forEach(s => {
            s.shape.setOptions({
              clickable: true,
              draggable: true,
              // editable: false,
              map: mapInstance
            });
            // s.outer.setMap(mapInstance)
            // s.shape.setMap(mapInstance)
          });
        }
      } else t.active = false;
    });

    this.setState({ currentTag, tags, canDraw }, () => {
      if (!currentTag.shapes.length) {
        // Fetch shapes if new/no shapes
        const url = "/api/v1/tags-influence",
          params = { tags_ids: [currentTag.id] };

        this.http.get(url, params, auth).then(res => {
          const results = res.data.tags;
          if (results.length) this.drawFetchedShapes(results, currentTag);
        });
      }
    });
  };

  drawFetchedShapes = (results, tag) => {
    let { mapInstance, mapsApi } = this.state,
      shapeProps = {
        strokeColor: tag.color,
        strokeOpacity: 1,
        strokeWeight: 2,
        fillColor: tag.color,
        fillOpacity: 0.8,
        clickable: true,
        // editable: true,
        suppressUndo: true,
        draggable: true,
        zIndex: 1
      };

    results.forEach(result => {
      const areas = result.areas;
      // areas.length && l(areas)
      areas.forEach(area => {
        let coords = area.geometry.coordinates,
          shape;

        switch (area.properties.type) {
          case "polygon":
            // So that duplicate vertices are not drawn
            let path = coords[0].map(p => new mapsApi.LatLng(p[1], p[0]));
            path.splice(-1);

            shape = new mapsApi.Polygon({
              ...shapeProps,
              map: mapInstance,
              path
            });
            break;

          case "circle":
            shape = new mapsApi.Circle({
              ...shapeProps,
              map: mapInstance,
              center: new mapsApi.LatLng(coords[1], coords[0]),
              // radius: radius*100,
              radius: area.properties.radius * 1
            });
            break;

          default:
            let bounds = new mapsApi.LatLngBounds();
            coords[0].forEach(p =>
              bounds.extend(new mapsApi.LatLng(p[1], p[0]))
            );
            shape = new mapsApi.Rectangle({
              ...shapeProps,
              map: mapInstance,
              bounds
            });
            break;
        }

        this.addShapeAndEventHandlers(
          shape,
          area.properties.type,
          "fetch",
          area,
          tag
        );
      });
    });
  };

  placesChanged = places => {
    const { location } = places[0].geometry;
    currentCenter.coordinates = [location.lng(), location.lat()];
    this.state.mapInstance.setCenter(places[0].geometry.location);
  };

  chooseColor = tag => {
    let availColors = palette.filter(c => !c.tagId),
      chosenColor;

    if (availColors.length) {
      chosenColor = availColors[randBetween(0, availColors.length - 1)];
      chosenColor.tagId = tag.id;
    } else {
      chosenColor = {
        color: generateColor(),
        tagId: tag.id
      };
      palette.push(chosenColor);
    }
    return chosenColor.color;
  };

  startDrawing = type => {
    const { drawingManager, mapsApi } = this.state;
    switch (type) {
      case "polygon":
        drawingManager.setDrawingMode(mapsApi.drawing.OverlayType.POLYGON);
        break;

      case "circle":
        drawingManager.setDrawingMode(mapsApi.drawing.OverlayType.CIRCLE);
        break;

      default:
        drawingManager.setDrawingMode(mapsApi.drawing.OverlayType.RECTANGLE);
        break;
    }
  };

  tagAdded = tag => {
    // l(tag)
    let { tags } = this.state;
    if (checkDuplicate(tags, tag)) return;

    tag.color = this.chooseColor(tag);
    tag.shapes = [];
    tag.showInfluenceShape = false;
    tags.push(tag);
    this.setState({ tags }, this.tagSelected(tag));
  };

  tagDeselected = () => {
    let { tags, drawingManager } = this.state,
      canDraw = false;

    tags.forEach(t => {
      t.active = false;
      t.showInfluenceShape = false;
      t.shapes.forEach(s => {
        s.selected = false;
        // s.shape.setMap(null)
        s.shape.setOptions({
          clickable: false,
          draggable: false,
          editable: false
        });
        s.outer.setOptions({ editable: false, map: null });
      });
    });
    drawingManager.setDrawingMode(null);
    this.setState({
      currentTag: null,
      tags,
      canDraw,
      undoRedo: { enabled: false, type: "undo" }
    });
  };

  tagDeleted = tag => {
    let { tags } = this.state,
      canDraw = false;

    // Delete tags
    tags = tags.filter(t => t.id !== tag.id);
    this.setState({
      currentTag: null,
      tags,
      canDraw,
      undoRedo: { enabled: false, type: "undo" }
    });

    // Delete drawn shapes
    tag.shapes.forEach(s => {
      s.shape.setMap(null);
      s.outer.setMap(null);
    });

    // Reset palette
    palette.filter(c => c.tagId === tag.id)[0].tagId = null;
  };

  // Resets influence to 3m (default), keeps outer shape
  resetInfluence = currShape => {
    let { currentTag, mapsApi } = this.state,
      sph = mapsApi.geometry.spherical;

    currShape.influence = this.props.influence;

    switch (currShape.type) {
      case "polygon":
        currShape.outer.setPath(
          currShape.shape
            .getPath()
            .getArray()
            .map(pt =>
              sph.computeOffset(
                pt,
                currShape.influence,
                getBearing(currShape.shape.getCenter(), pt)
              )
            )
        );
        break;
      case "circle":
        currShape.outer.setRadius(
          currShape.shape.getRadius() + currShape.influence
        );
        break;
      default:
        let innerBounds = currShape.shape.getBounds(),
          inner_ne = innerBounds.getNorthEast(),
          inner_sw = innerBounds.getSouthWest();

        currShape.outer.setBounds(
          new mapsApi.LatLngBounds(
            sph.computeOffset(
              inner_sw,
              currShape.influence * Math.sqrt(2),
              225
            ),
            sph.computeOffset(inner_ne, currShape.influence * Math.sqrt(2), 45)
          )
        );
        break;
    }
    this.setState({ currentTag });
  };

  // Undo / redo
  undoRedoAction = type => {
    let { currentTag, currentShape, mapsApi } = this.state;

    undoRedoObj.clicked = true;
    l(undoRedoObj);

    switch (currentShape.type) {
      case "polygon":
        switch (undoRedoObj.action) {
          case "changed_outer":
            // l("prev lat 0",  currentShape.undoRedo.outer.path.prev[0].lat(), "curr lat 0", currentShape.undoRedo.outer.path.curr[0].lat())

            // swap curr and prev position
            let temp = [...currentShape.undoRedo.outer.path.prev];
            currentShape.undoRedo.outer.path.prev = [
              ...currentShape.undoRedo.outer.path.curr
            ];
            currentShape.undoRedo.outer.path.curr = temp;

            currentShape.outer.setPath(temp);
            // l("prev lat 1",  currentShape.undoRedo.outer.path.prev[1].lat(), "curr lat 1", currentShape.undoRedo.outer.path.curr[1].lat())

            currentShape.outer
              .getPath()
              .addListener("set_at", polyOuterListener);
            currentShape.outer
              .getPath()
              .addListener("insert_at", polyOuterListener);
            break;

          case "vertex_removed":
          default:
            // 'changed_inner':
            currentShape.shape.setPath(currentShape.undoRedo.shape.path.prev);
            currentShape.undoRedo.shape.path.prev = [
              ...currentShape.undoRedo.shape.path.curr
            ];
            setNewPath();
            break;
        }
        break;

      case "circle":
        switch (undoRedoObj.action) {
          case "radius_changed_inner":
            currentShape.shape.setRadius(
              currentShape.undoRedo.shape.radius.prev
            );
            break;

          case "radius_changed_outer":
            currentShape.outer.setRadius(
              currentShape.undoRedo.outer.radius.prev
            );
            break;

          default:
            // "center_changed"
            currentShape.shape.setCenter(
              currentShape.undoRedo.shape.center.prev
            );
            break;
        }
        break;

      default:
        switch (undoRedoObj.action) {
          case "bounds_changed_outer":
            currentShape.outer.setBounds(
              new mapsApi.LatLngBounds(
                currentShape.undoRedo.outer.sw.prev,
                currentShape.undoRedo.outer.ne.prev
              )
            );
            break;

          default:
            // 'bounds_changed_inner':
            currentShape.shape.setBounds(
              new mapsApi.LatLngBounds(
                currentShape.undoRedo.shape.sw.prev,
                currentShape.undoRedo.shape.ne.prev
              )
            );
            break;
        }
        break;
    }

    this.setState(
      {
        currentTag,
        currentShape,
        undoRedo: { enabled: true, time: 10, type } // "redo" / "undo"
      },
      this.undoRedoTimer
    );
  };

  // 10s timer for undo / redo
  undoRedoTimer = () => {
    let { undoRedo } = this.state,
      time;

    clearInterval(undoRedoObj.interval);
    undoRedoObj.interval = setInterval(() => {
      // l(undoRedo.time)
      undoRedo.time -= 1;
      time = undoRedo.time;
      this.setState(prev => ({ undoRedo: { ...prev.undoRedo, time } }));

      // End condition
      if (time === 0) {
        clearInterval(undoRedoObj.interval);
        this.setState(prev => ({
          undoRedo: { ...prev.undoRedo, enabled: false }
        }));
      }
    }, 1000);
  };

  save = () => {
    this.showNotification("success");
    return;

    cl();
    l("createArray", createArray);
    l("updateArray", updateArray);
    l("deleteArray", deleteArray);

    const { tags } = this.state,
      getShapeForRequest = (el, reqType) => {
        let { tagId, shapeId } = el,
          currTag = tags.filter(t => t.id === tagId)[0],
          currShape,
          retObj;

        if (reqType === "update")
          currShape = currTag.shapes.filter(s => s.id === el.id);
        else currShape = currTag.shapes.filter(s => s.shapeId === shapeId);

        let { shape, outer, type } = currShape[0];

        switch (type) {
          case "polygon":
            let shape_points = shape.getPath().getArray(),
              shape_coords = shape_points.map(pt => [pt.lng(), pt.lat()]),
              outer_points = outer.getPath().getArray(),
              outer_coords = outer_points.map(pt => [pt.lng(), pt.lat()]);

            shape_coords.push([shape_points[0].lng(), shape_points[0].lat()]);
            outer_coords.push([outer_points[0].lng(), outer_points[0].lat()]);

            retObj = {
              geometry: {
                type: "Polygon",
                coordinates: [shape_coords]
              },
              properties: {
                type: "polygon"
              },
              influence_polygon: {
                geometry: {
                  type: "Polygon",
                  coordinates: [outer_coords]
                },
                properties: {
                  type: "polygon"
                }
              }
            };
            break;

          case "circle":
            retObj = {
              geometry: {
                type: "Point",
                coordinates: [shape.getCenter().lng(), shape.getCenter().lat()]
              },
              properties: {
                radius: shape.getRadius(),
                type: "circle"
              },
              influence_polygon: {
                geometry: {
                  coordinates: [
                    outer.getCenter().lng(),
                    outer.getCenter().lat()
                  ]
                },
                properties: {
                  radius: outer.getRadius(),
                  // radius: outer.getRadius() - shape.getRadius(),
                  type: "circle"
                }
              }
            };
            break;

          default:
            let inner_ne = shape.getBounds().getNorthEast(),
              inner_sw = shape.getBounds().getSouthWest(),
              outer_ne = outer.getBounds().getNorthEast(),
              outer_sw = outer.getBounds().getSouthWest(),
              vertices_inner = [
                // Starting from ne
                [inner_ne.lng(), inner_ne.lat()],
                [inner_ne.lng(), inner_sw.lat()],
                [inner_sw.lng(), inner_sw.lat()],
                [inner_sw.lng(), inner_ne.lat()],
                [inner_ne.lng(), inner_ne.lat()]
              ],
              vertices_outer = [
                // Starting from ne
                [outer_ne.lng(), outer_ne.lat()],
                [outer_ne.lng(), outer_sw.lat()],
                [outer_sw.lng(), outer_sw.lat()],
                [outer_sw.lng(), outer_ne.lat()],
                [outer_ne.lng(), outer_ne.lat()]
              ];

            retObj = {
              geometry: {
                type: "Polygon",
                coordinates: [vertices_inner]
              },
              properties: {
                bounds: {
                  south: inner_sw.lat(),
                  west: inner_sw.lng(),
                  north: inner_ne.lat(),
                  east: inner_ne.lng()
                },
                type: "rectangle"
              },
              influence_polygon: {
                geometry: {
                  type: "Polygon",
                  coordinates: [vertices_outer]
                },
                properties: {
                  bounds: {
                    south: outer_sw.lat(),
                    west: outer_sw.lng(),
                    north: outer_ne.lat(),
                    east: outer_ne.lng()
                  },
                  // bounds: {
                  //   south: 40.73484702898561,
                  //   west: -73.9879336609497,
                  //   north: 40.738293908072286,
                  //   east: -73.9827838196411
                  // },
                  type: "rectangle"
                }
              }
            };
            break;
        }

        if (reqType === "update") retObj.id = el.id;
        return retObj;
      };

    try {
      let tmpObj = {},
        req;
      if (createArray.length) {
        createArray.forEach(el => {
          if (tmpObj[el.tagId])
            tmpObj[el.tagId].areas.push(getShapeForRequest(el, "create"));
          else
            tmpObj[el.tagId] = {
              id: el.tagId,
              areas: [getShapeForRequest(el, "create")]
            };
        });

        req = Object.values(tmpObj);
        // l(req)

        this.http
          .post("/api/v1/tags-influence", { tags: req }, auth)
          .then(res => {
            // l(res)
            // Here remove the original shapes and draw from result
            res.data.tags.forEach(r => {
              let currTag = tags.filter(t => t.id === r.id)[0],
                currShapes = currTag.shapes.filter(s => s.id === null);

              currShapes.forEach(currShape => {
                currShape.shape.setMap(null);
                currShape.outer.setMap(null);
                currShape.shape = null;
                currShape.outer = null;
              });

              currTag.shapes = currTag.shapes.filter(s => s.id !== null);
              this.drawFetchedShapes([r], currTag);
            });

            createArray.length = 0;
            this.showNotification("success");
          });
        // .catch(err => l(err))
      }

      if (deleteArray.length) {
        tmpObj = {};
        deleteArray.forEach(el => {
          if (tmpObj[el.tagId]) tmpObj[el.tagId].ids.push(el.id);
          else tmpObj[el.tagId] = { tagId: el.tagId, ids: [el.id] };
        });

        req = Object.values(tmpObj);
        // l(req)

        req.forEach(el => {
          this.http.delete("/api/v1/tags-influence", el, auth).then(res => {
            // l(res)
            deleteArray = deleteArray.filter(item => item.tagId !== el.tagId);
            if (!deleteArray.length) this.showNotification("success");
          });
          // .catch(err => l(err))
        });
      }

      if (updateArray.length) {
        tmpObj = {};
        updateArray.forEach(el => {
          if (tmpObj[el.tagId])
            tmpObj[el.tagId].areas.push(getShapeForRequest(el, "update"));
          else
            tmpObj[el.tagId] = {
              id: el.tagId,
              areas: [getShapeForRequest(el, "update")]
            };
        });

        req = Object.values(tmpObj);
        // l(req)

        this.http
          .post("/api/v1/tags-influence/update", { tags: req }, auth)
          .then(res => {
            // l(res)
            updateArray.length = 0;
            this.showNotification("success");
          });
      }
    } catch (err) {
      l(err);
      this.showNotification("failure");
    }
  };

  showNotification = notifType => {
    this.setState({
      showNotif: true,
      notifType,
      undoRedo: { enabled: false, type: "undo" }
    });
    clearTimeout(submitTimer);
    submitTimer = setTimeout(() => {
      this.setState({ showNotif: false, notifType: "" });
    }, 3000);
  };

  sidebarClicked = e => {
    if (
      $(e.target).hasClass("react-switch-handle") ||
      $(e.target).hasClass("react-switch-bg")
    )
      sp(e);
    else this.tagDeselected();
  };

  toggleInfluenceShape = currentTag => {
    let { mapInstance, tags } = this.state;
    currentTag.showInfluenceShape = !currentTag.showInfluenceShape;
    currentTag.shapes.forEach(s => {
      s.outer.setOptions({
        map: currentTag.showInfluenceShape || s.selected ? mapInstance : null
      });
    });
    this.setState({ tags });
  };

  toggled = show => {
    // sp(e)
    this.setState({ show });
  };

  render() {
    const {
        mapsApiLoaded,
        mapInstance,
        mapsApi,
        currentTag,
        tags,
        canDraw,
        undoRedo,
        showNotif,
        notifType,
        sidebarHidden
      } = this.state,
      sidebarClass = `sidebar${sidebarHidden ? " hidden" : ""}`;

    return (
      <div className="map-outer">
        <nav className="navbar navbar-expand-lg navbar-dark">
          <a
            className="navbar-brand"
            id="sidebar-collapse"
            role="button"
            tabIndex="0"
            onClick={this.toggleSidebar}
          >
            <img src="assets/burger.svg" alt="" />
          </a>
          <div className="ml-auto">
            <ul className="navbar-nav">
              <li className="nav-item">
                <img className="avatar" src="assets/user-icon.png" alt="" />
                <span className="mx-3">{this.state.username}</span>
              </li>
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  data-toggle="dropdown"
                ></a>
                <div className="dropdown-menu">
                  <a className="dropdown-item" onClick={this.logout} href="#">
                    Logout
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </nav>
        <div className="wrapper">
          <div className={sidebarClass} onClick={e => this.sidebarClicked(e)}>
            {tags.length > 0 && (
              <div className="tag-row-outer">
                <div className="tag-label">Tag</div>
                <div className="tag-label text-center">
                  Influence
                  <br /> Polygon
                </div>
              </div>
            )}
            {tags.length > 0 &&
              tags.map((tag, idx) => {
                return (
                  <div className="tag-row-outer" key={idx}>
                    <div
                      className={`tag-row ${tag.active ? "active" : ""} `}
                      onClick={e => {
                        sp(e);
                        this.tagSelected(tag);
                      }}
                      title={tag.full_name}
                    >
                      <div
                        className="tag-color"
                        style={{
                          border: `1px solid ${tag.color}`,
                          borderRadius: 2,
                          backgroundColor: `${hex2rgba(tag.color, 0.3)}`
                        }}
                      ></div>
                      {tag.image ? (
                        <img className="tag-img" src={tag.image} alt="" />
                      ) : (
                        <img
                          className="tag-img"
                          src="assets/tag-plh.png"
                          alt=""
                        />
                      )}
                      <div className="tag-title">{tag.full_name}</div>
                      <img
                        src="assets/delete-tag-black.svg"
                        className="tag-delete"
                        onClick={e => {
                          sp(e);
                          this.tagDeleted(tag);
                        }}
                        alt=""
                      />
                    </div>
                    <Switch
                      className="tag-toggle"
                      // checked={this.state.show}
                      // onChange={this.toggled}
                      checked={tag.showInfluenceShape}
                      onChange={() => this.toggleInfluenceShape(tag)}
                      uncheckedIcon={false}
                      checkedIcon={false}
                      handleDiameter={6}
                      onColor="#5ca9fc"
                      onHandleColor="#fff"
                      height={20}
                      width={40}
                    />
                  </div>
                );
              })}
            {tags.length === 0 && <h5>No tags selected</h5>}
          </div>
          <div className="content">
            <GoogleMapReact
              options={{
                streetViewControl: true,
                styles: mapStyles
              }}
              bootstrapURLKeys={{
                libraries: ["drawing", "geometry", "places"],
                key: "AIzaSyB977EFLp4w9wVttk6Ne7s1CejK9LQyvsQ"
              }}
              defaultCenter={this.props.center}
              defaultZoom={this.props.zoom}
              onGoogleApiLoaded={({ map, maps }) => this.apiLoaded(map, maps)}
              yesIWantToUseGoogleMapApiInternals
            >
              {currentTag &&
                currentTag.shapes.map((s, idx) => {
                  return s.selected ? (
                    <InfluenceBox
                      key={idx}
                      lat={s.getInfPos().lat()}
                      lng={s.getInfPos().lng()}
                      text={`${s.influence} m`}
                      // onClearInfluence={() => this.clearInfluence(s)}
                      onResetInfluence={() => this.resetInfluence(s)}
                      undo={s.undo}
                      undoTime={s.undoTime}
                      undoNotAllowed={s.undoNotAllowed}
                      onUndo={() => this.undoClearInfluence(s)}
                    />
                  ) : null;
                })}
            </GoogleMapReact>
            <div className="search-bar" ref={this.searchplaces}>
              {mapsApiLoaded && (
                <SearchBox
                  map={mapInstance}
                  mapsApi={mapsApi}
                  onPlacesChanged={this.placesChanged}
                />
              )}
            </div>
            <div className="search-bar" ref={this.searchtags}>
              <AutoComplete
                inputProps={{
                  // value: "a",
                  placeholder: "Search for tags ..."
                }}
                optionSelected={this.tagAdded}
                // type="tag"
                // inputChanged={this.handleAutoInput}
                // getCurrSugg={this.handleSuggestions}
              />
            </div>
            <div
              className={`draw-shape ${canDraw ? "" : "disabled"}`}
              ref={this.drawshapes}
            >
              <div
                className="ctn-icon"
                onClick={() => canDraw && this.startDrawing("polygon")}
              >
                <img className="pr" src="assets/edit-grey.svg" alt="" />
                <img className="sc" src="assets/edit-active.svg" alt="" />
              </div>
              <div
                className="ctn-icon"
                onClick={() => canDraw && this.startDrawing("circle")}
              >
                <img className="pr" src="assets/circle-grey.svg" alt="" />
                <img className="sc" src="assets/circle-active.svg" alt="" />
              </div>
              <div
                className="ctn-icon"
                onClick={() => canDraw && this.startDrawing("rectangle")}
              >
                <img className="pr" src="assets/square-grey.svg" alt="" />
                <img className="sc" src="assets/square-active.svg" alt="" />
              </div>
            </div>
            <div className="undo-btns" ref={this.undobtns}>
              {undoRedo.enabled && (
                <>
                  <div
                    className={`ctn-icon ${
                      undoRedo.type === "undo" ? "" : "disabled"
                    }`}
                    onClick={() => {
                      undoRedo.type === "undo" && this.undoRedoAction("redo");
                    }}
                  >
                    <img src="assets/corner-up-left.svg" alt="" />
                  </div>
                  <div
                    className={`ctn-icon ${
                      undoRedo.type === "redo" ? "" : "disabled"
                    }`}
                    onClick={() => {
                      undoRedo.type === "redo" && this.undoRedoAction("undo");
                    }}
                  >
                    <img src="assets/corner-up-right.svg" alt="" />
                  </div>
                  <span>&nbsp;&nbsp;{undoRedo.time}s</span>
                </>
              )}
            </div>
            <button
              className="btn-accent"
              onClick={this.save}
              ref={this.savebtn}
              disabled={!this.state.currentTag}
            >
              Save
            </button>
            {showNotif && (
              <div className="notif">
                {notifType === "success" && "Data submitted successfully!"}
                {notifType === "failure" &&
                  "An error occured. Please try again."}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

/* eslint-disable no-script-url */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { Component } from 'react'
import $ from 'jquery'
import GoogleMapReact from 'google-map-react'
import { l, auth, generateColor, sp, rand, randBetween } from '../helpers/common'

import SearchBox from './SearchBox'
import AutoComplete from './AutoComplete'
import HttpService from '../services/HttpService'

const InfluenceBox = ({ text, onClearInfluence }) => {
  return (
    <div className="ctn-influence">
      {text}
      {/* <img onClick={onClearInfluence} src="assets/clear.svg" alt=""/> */}
    </div>
  )
}

const checkDuplicate = (items, item) => {
  return !!items.filter(t => t.id === item.id).length
}
, findShapeGroupById = (shapes, id) => {
  let result = shapes.filter(t => t.shapeId === id)
    , len = result.length
  return len ? result[0] : len
}
, radians = n => n * (Math.PI / 180)
, degrees = n => n * (180 / Math.PI)
, getBearing = (start, end) => {
  let startLat = radians(start.lat())
  , startLong = radians(start.lng())
  , endLat = radians(end.lat())
  , endLong = radians(end.lng())
  , dLong = endLong - startLong
  , dPhi = Math.log(Math.tan(endLat / 2.0 + Math.PI / 4.0) / Math.tan(startLat / 2.0 + Math.PI / 4.0))
  
  if (Math.abs(dLong) > Math.PI) {
    if (dLong > 0.0)
      dLong = -(2.0 * Math.PI - dLong)
    else
      dLong = (2.0 * Math.PI + dLong)
  }

  return (degrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0
}

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
  { color: "#3999ff", tagId: null },
]
, createArray = []
, updateArray = []
, deleteArray = []

export default class MapComponent extends Component {
  constructor(props){
    super(props)
    this.searchplaces = React.createRef()
    this.savebtn = React.createRef()
    this.searchtags = React.createRef()
    this.drawshapes = React.createRef()

    this.http = new HttpService()
    this.state = {
      name: 'Yul5ia',
      username: 'supervisor@mail.ru',
      mapsApiLoaded: false,
      mapInstance: null,
      mapsApi: null,
      currentTag: null,
      tags: [],
      canDraw: false
    }
  }

  static defaultProps = {
    center: {
      lat: 40.78343,
      lng: -73.96625
    },
    zoom: 15,
    // zoom: 20,
    influence: 3
  }

  componentDidMount(){
    $(() => {
      $('#sidebar-collapse').on('click', () => {
        $('.sidebar').toggleClass('hidden')
      })
    })
  }
  
  logout = () => this.props.logout()
  
  apiLoaded = (map, maps) => {
    // Adding controls
    map.controls[maps.ControlPosition.LEFT_TOP].push(this.searchtags.current)
    map.controls[maps.ControlPosition.LEFT_TOP].push(this.drawshapes.current)
    
    this.savebtn.current.index = -1
    map.controls[maps.ControlPosition.RIGHT_TOP].push(this.searchplaces.current)
    map.controls[maps.ControlPosition.RIGHT_BOTTOM].push(this.savebtn.current)
    
    // Adding methods to google maps namespace object prototypes
    maps.Rectangle.prototype.getCenter =  function() {
      return this.getBounds().getCenter()
    }
    maps.Rectangle.prototype.getTopRight = function () {
      // let ne = this.getBounds().getNorthEast()
      // return new maps.LatLng(ne.lat() + 0.002, ne.lng() + 0.002)
      return this.getBounds().getNorthEast()
    }

    maps.Polygon.prototype.getCenter = function () {
      let arr = this.getPath().getArray()
      , distX = 0, distY = 0
      , len = arr.length

      arr.forEach(element => {
        distX += element.lat()
        distY += element.lng()
      })

      return new maps.LatLng(distX / len, distY / len)
    }
    maps.Polygon.prototype.getBounds = function () {
      let bounds = new maps.LatLngBounds()
      this.getPath().forEach(element => bounds.extend(element))
      return bounds
    }
    maps.Polygon.prototype.getTopRight = function () {
      return this.getBounds().getNorthEast()
    }
    
    maps.Circle.prototype.getTopRight = function () {
      return this.getBounds().getNorthEast()
    }
    
    // Adding listeners for keyboard and open map areas
    // maps.event.addListener(map, "click", e => {
    //   l("map clicked", e)
    //   let { currentTag } = this.state
    //   if (currentTag){
    //     currentTag.shapes.forEach(s => s.selected = false)
    //     this.setState({ currentTag })
    //   }
    // })

    maps.event.addDomListener(document, "keyup", e => {
      if(e.target.tagName !== "INPUT"){
        const key = e.keyCode ? e.keyCode : e.which
        let { currentTag } = this.state
        // l(key)        
        if (currentTag){
          switch (key) {
            case 8:
              let selected = currentTag.shapes.filter(s => s.selected)
              if(selected.length){
                // Remove current shape from map
                selected[0].shape.setMap(null)
                selected[0].outer.setMap(null) 
                
                // Remove current shape from tag
                currentTag.shapes = currentTag.shapes.filter(s => s.shapeId !== selected[0].shapeId)

                this.setState({ currentTag }, () => {
                  // Add to delete array for deletion
                  if (selected[0].id){
                    deleteArray.push({ tagId: currentTag.id, id: selected[0].id })
                    updateArray = updateArray.filter(t => t.id !== selected[0].id)
                    // l(deleteArray)
                  }
                })
              } else{              
                this.tagDeleted(currentTag)
              }
            break;
    
            default: break;
          }
        }
      }
    })
    
    // Adding drawing options
    const drawingManager = new maps.drawing.DrawingManager({ map, drawingControl: false })
    maps.event.addListener(drawingManager, "polygoncomplete", shape => this.addEventHandlers(shape, "polygon", "draw"))
    maps.event.addListener(drawingManager, "circlecomplete", shape => this.addEventHandlers(shape, "circle", "draw"))
    maps.event.addListener(drawingManager, "rectanglecomplete", shape => this.addEventHandlers(shape, "rectangle", "draw"))
    
    this.setState({
      mapsApiLoaded: true,
      mapInstance: map,
      mapsApi: maps,
      drawingManager
    })  
  }
  
  shapeSelected = shape => {
    let { currentTag } = this.state
    , currentShape = findShapeGroupById(currentTag.shapes, shape.shapeId)

    currentTag.shapes.forEach(s => s.selected = false)
    currentShape.selected = true
    this.setState({ currentTag })
  }

  addEventHandlers = (shape, type, method, id) => {
    let { mapsApi, mapInstance, currentTag, drawingManager } = this.state
    , sph = mapsApi.geometry.spherical
    , shapeId = rand(8)
    , rectEventType = null
    , polyEventType = null
    , outer
    
    drawingManager.setDrawingMode(null)
    shape.shapeId = shapeId
    shape.addListener("click", () => this.shapeSelected(shape))
    shape.addListener("drag", () => this.shapeSelected(shape))

    switch(type){
      case "polygon":
        // let np = sph.interpolate(start, pt, 1.008)
        outer = new mapsApi.Polygon({
          strokeColor: currentTag.color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: currentTag.color,
          fillOpacity: 0.35,
          map: mapInstance,
          editable: true,
          suppressUndo: true,
          // clickable: true,
          // draggable: false,
          zIndex: 0
        })

        const setNewPath = currentShape => {
          if (polyEventType === "fromSelf_inner"){
            currentShape.outer.getPath().clear()
            currentShape.outer.setMap(null)
          }
          currentShape.outer.setPath(currentShape.shape.getPath().getArray().map(pt => 
            sph.computeOffset(pt, currentShape.influence, getBearing(currentShape.shape.getCenter(), pt)))
          )

          if (polyEventType === "fromSelf_inner"){
            setTimeout(() => {
              currentShape.outer.setMap(mapInstance)
              mapsApi.event.trigger(currentShape.outer, "click", {})
            }, 10)
            // currentShape.outer.setMap(mapInstance)
            polyEventType = null
          }
          
          currentShape.outer.getPath().addListener("set_at", polyOuterListener)
          currentShape.outer.getPath().addListener("insert_at", polyOuterListener)

          currentTag.shapes.forEach(s => s.selected = false)
          currentShape.selected = true
          this.setState({ currentTag }, () => {
            if (currentShape.id && !checkDuplicate(updateArray, { id: currentShape.id })) {
              updateArray.push({ tagId: currentTag.id, id: currentShape.id })
              // l(updateArray)
            }
          })
        }
        , polyOuterListener = () => {
          // l('PolyEventType', polyEventType)
          let currentShape = findShapeGroupById(currentTag.shapes, outer.shapeId)
          , result = true

          if (polyEventType === "fromSelf_inner"){     
            this.setState({ currentTag })
            return
          }
          polyEventType = null

          // l('Outer vertex moved', currentShape)
          currentShape.outer.getPath().getArray().forEach(v => {
            result = result && !mapsApi.geometry.poly.containsLocation(v, currentShape.shape)
          })

          if (result) { // No outer point inside inner shape
            let max = 0
            currentShape.shape.getPath().getArray().forEach((v, idx) => {
              max = Math.max(max, Math.round(
                sph.computeDistanceBetween(v, outer.getPath().getArray()[idx]) / Math.sqrt(2)
              ))
            })
            currentShape.influence = max
            currentTag.shapes.forEach(s => s.selected = false)
            currentShape.selected = true
            this.setState({ currentTag })
          } else { // Atleast one outer point inside inner shape, reset to original influence
            currentShape.influence = this.props.influence
            polyEventType = "fromSelf_inner"
            setNewPath(currentShape)
          }
        }
        , path = shape.getPath()

        path.addListener("insert_at", () => {
          let currentShape = findShapeGroupById(currentTag.shapes, shape.shapeId)
          // l('Vertex added', currentShape)
          polyEventType = "vertexAdded"
          setNewPath(currentShape)
        })

        path.addListener("set_at", () => {
          let currentShape = findShapeGroupById(currentTag.shapes, shape.shapeId)
          // l('Vertex moved', currentShape)
          polyEventType = "vertexChanged"
          setNewPath(currentShape)
        })
        
        outer.setPath(path.getArray().map(pt => sph.computeOffset(pt, this.props.influence, getBearing(shape.getCenter(), pt))))
        outer.getPath().addListener("set_at", polyOuterListener)
        outer.getPath().addListener("insert_at", polyOuterListener)
      break;

      case "circle":
        const setNewShape = currentShape => {
          this.setState({ currentTag }, () => {
            if (currentShape.id && !checkDuplicate(updateArray, { id: currentShape.id })) {
              updateArray.push({ tagId: currentTag.id, id: currentShape.id })
              // l(updateArray)
            }
          })  
        }

        shape.addListener("radius_changed", () => {
          let currentShape = findShapeGroupById(currentTag.shapes, shape.shapeId)
          currentShape.outer.setRadius(currentShape.shape.getRadius() + currentShape.influence)
          setNewShape(currentShape)
        })

        shape.addListener("center_changed", () => {
          let currentShape = findShapeGroupById(currentTag.shapes, shape.shapeId)
          currentShape.outer.setCenter(currentShape.shape.getCenter())
          setNewShape(currentShape)
        })

        // Outer shape for circle
        outer = new mapsApi.Circle({
          strokeColor: currentTag.color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: currentTag.color,
          fillOpacity: 0.35,
          // radius: shape.getRadius() * 1.5,
          radius: shape.getRadius() + this.props.influence,
          center: shape.getCenter(),
          editable: true,
          suppressUndo: true,
          // draggable: true,
          map: mapInstance,
          zIndex: 0
        })

        outer.addListener("radius_changed", () => {
          // Change influence according to new radius
          let currentShape = findShapeGroupById(currentTag.shapes, outer.shapeId)
          
          currentTag.shapes.forEach(s => s.selected = false)
          currentShape.selected = true

          currentShape.influence = Math.round(currentShape.outer.getRadius() - currentShape.shape.getRadius())
          if (currentShape.influence < this.props.influence){
            currentShape.influence = this.props.influence
            currentShape.outer.setRadius(currentShape.shape.getRadius() + currentShape.influence)
          }
          setNewShape(currentShape)
        })

      break;
      
      default:
        shape.addListener("bounds_changed", () => {
          let currentShape = findShapeGroupById(currentTag.shapes, shape.shapeId)

          rectEventType = "from_inner"
          currentShape.outer.setBounds(            
            new mapsApi.LatLngBounds(
              sph.computeOffset(currentShape.shape.getBounds().getSouthWest(), currentShape.influence * Math.sqrt(2), 225),
              sph.computeOffset(currentShape.shape.getBounds().getNorthEast(), currentShape.influence * Math.sqrt(2), 45),
            )
          )
        })

        outer = new mapsApi.Rectangle({
          strokeColor: currentTag.color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: currentTag.color,
          fillOpacity: 0.35,
          map: mapInstance,
          editable: true,
          // draggable: true,
          suppressUndo: true
        })        

        outer.addListener("bounds_changed", () => {
          let currentShape
          , vertices_inner
          , innerBounds
          , inner_ne
          , inner_sw
          , vertices_outer
          , all_vertices_outer
          , outerBounds
          , outer_ne
          , outer_sw
          , result = true

          // l("Changed outer", rectEventType)
          if (rectEventType !== "init"){ 
            currentShape = findShapeGroupById(currentTag.shapes, shape.shapeId)
            currentTag.shapes.forEach(s => s.selected = false)
            currentShape.selected = true
          }

          switch(rectEventType){
            case "init": // Set area first time and return
              outer_ne = outer.getBounds().getNorthEast()
              outer_sw = outer.getBounds().getSouthWest()
              vertices_outer = [ // Starting from ne
                new mapsApi.LatLng(outer_ne.lat(), outer_ne.lng()),
                new mapsApi.LatLng(outer_sw.lat(), outer_ne.lng()),
                new mapsApi.LatLng(outer_sw.lat(), outer_sw.lng()),
                new mapsApi.LatLng(outer_ne.lat(), outer_sw.lng()),
              ] 

              outer.area = sph.computeArea(vertices_outer)
              rectEventType = null
            return;
            
            case "fromSelf_inner": // Some points inside
            case "fromSelf_drag": // Dragging
              outer_ne = currentShape.outer.getBounds().getNorthEast()
              outer_sw = currentShape.outer.getBounds().getSouthWest()
              vertices_outer = [ // Starting from ne
                new mapsApi.LatLng(outer_ne.lat(), outer_ne.lng()),
                new mapsApi.LatLng(outer_sw.lat(), outer_ne.lng()),
                new mapsApi.LatLng(outer_sw.lat(), outer_sw.lng()),
                new mapsApi.LatLng(outer_ne.lat(), outer_sw.lng()),
              ]

              currentShape.outer.area = sph.computeArea(vertices_outer)
              rectEventType = null
              this.setState({ currentTag })
            return;

            default: // fromInner
              rectEventType = null
              this.setState({ currentTag })
            break;
          }
          
          // Change influence and keep bounds in check here
          innerBounds = currentShape.shape.getBounds()
          inner_ne = innerBounds.getNorthEast()
          inner_sw = innerBounds.getSouthWest()
          
          outerBounds = currentShape.outer.getBounds()
          outer_ne = outerBounds.getNorthEast()
          outer_sw = outerBounds.getSouthWest()

          vertices_inner = [ // Starting from ne
            new mapsApi.LatLng(inner_ne.lat(), inner_ne.lng()),
            new mapsApi.LatLng(inner_sw.lat(), inner_ne.lng()),
            new mapsApi.LatLng(inner_sw.lat(), inner_sw.lng()),
            new mapsApi.LatLng(inner_ne.lat(), inner_sw.lng()),
          ] 
          
          vertices_outer = [ // Starting from ne
            new mapsApi.LatLng(outer_ne.lat(), outer_ne.lng()),
            new mapsApi.LatLng(outer_sw.lat(), outer_ne.lng()),
            new mapsApi.LatLng(outer_sw.lat(), outer_sw.lng()),
            new mapsApi.LatLng(outer_ne.lat(), outer_sw.lng()),
          ] 
          
          all_vertices_outer = [ // For the side points as well
            ...vertices_outer,
            new mapsApi.LatLng((outer_ne.lat() + outer_sw.lat())/2, outer_ne.lng()),
            new mapsApi.LatLng(outer_sw.lat(), (outer_ne.lng() + outer_sw.lng())/2),
            new mapsApi.LatLng((outer_sw.lat() + outer_ne.lat())/2, outer_sw.lng()),
            new mapsApi.LatLng(outer_ne.lat(), (outer_sw.lng() + outer_ne.lng())/2),
          ] 

          all_vertices_outer.forEach(v => {
            result = result && !currentShape.shape.getBounds().contains(v)
          })
          
          if(result){ // No outer point inside inner shape
            let new_area = sph.computeArea(vertices_outer)
            , old_area = currentShape.outer.area
            // l(new_area, old_area)
            if (new_area < old_area){ // Is the new shape smaller? Then set influence as smallest vertex distance
              let min = Infinity
              vertices_inner.forEach((v, idx) => {
                min = Math.min(min, Math.round(
                  sph.computeDistanceBetween(v, vertices_outer[idx]) / Math.sqrt(2)
                ))
              })
              currentShape.influence = min
            } else { // Is the new shape bigger? Then set influence as largest vertex distance
              let max = 0
              vertices_inner.forEach((v, idx) => {
                max = Math.max(max, Math.round(
                  sph.computeDistanceBetween(v, vertices_outer[idx]) / Math.sqrt(2)
                ))
              })
              currentShape.influence = max
            }
            rectEventType = "fromSelf_drag"            
          } else { // Atleast one outer point inside inner shape, reset to original influence
            currentShape.influence = this.props.influence
            rectEventType = "fromSelf_inner"
          }

          if (currentShape.id && !checkDuplicate(updateArray, { id: currentShape.id })) {
            updateArray.push({ tagId: currentTag.id, id: currentShape.id })
            // l(updateArray)
          }

          currentShape.outer.setBounds(new mapsApi.LatLngBounds(
            sph.computeOffset(inner_sw, currentShape.influence * Math.sqrt(2), 225),
            sph.computeOffset(inner_ne, currentShape.influence * Math.sqrt(2), 45),
          ))

        })

        rectEventType = "init"
        outer.setBounds(new mapsApi.LatLngBounds(
          sph.computeOffset(shape.getBounds().getSouthWest(), this.props.influence * Math.sqrt(2), 225),
          sph.computeOffset(shape.getBounds().getNorthEast(), this.props.influence * Math.sqrt(2), 45),
        ))
      break;
    }

    outer.shapeId = shapeId
    outer.addListener("click", () => this.shapeSelected(outer))
    // outer.addListener("click", e => { l(e); this.shapeSelected(outer) })

    currentTag.shapes.forEach(s => s.selected = false)
    currentTag.shapes.push({
      id: method === "fetch" ? id : null, // For API operations
      shapeId, // For drawing operations
      type,
      shape: shape,
      outer: outer,
      influence: this.props.influence,
      selected: method === "fetch" ? false : true
    })

    this.setState({ currentTag }, () => {
      if (method === "draw"){
        createArray.push({ tagId: currentTag.id, shapeId })
        // l(createArray)
      }
    })
  }

  placesChanged = places => this.state.mapInstance.setCenter(places[0].geometry.location)
  
  chooseColor = tag => {
    let availColors = palette.filter(c => !c.tagId)
    , chosenColor

    if (availColors.length){
      chosenColor = availColors[randBetween(0, availColors.length - 1)]
      chosenColor.tagId = tag.id
    } else{
      chosenColor = {
        color: generateColor(),
        tagId: tag.id
      }
      palette.push(chosenColor)
    }
    return chosenColor.color
  }

  startDrawing = type => {
    const { drawingManager, mapsApi } = this.state
    switch (type) {
      case "polygon":
        drawingManager.setDrawingMode(mapsApi.drawing.OverlayType.POLYGON)
        break;

      case "circle":
        drawingManager.setDrawingMode(mapsApi.drawing.OverlayType.CIRCLE)
        break;

      default:
        drawingManager.setDrawingMode(mapsApi.drawing.OverlayType.RECTANGLE)
        break;
    }
  }

  tagAdded = tag => {
    // l(tag)
    let { tags } = this.state
    if(checkDuplicate(tags, tag)) return
    
    tag.color = this.chooseColor(tag)
    tag.shapes = []
    tags.push(tag)
    this.setState({ tags }, this.tagSelected(tag))
  }
  
  tagDeselected = () => {
    let { tags } = this.state
    , canDraw = false
    
    tags.forEach(t => {
      t.active = false
      t.shapes.forEach(s => {
        s.selected = false
        s.shape.setMap(null)
        s.outer.setMap(null)
      })
    })
    this.setState({ currentTag: null, tags, canDraw })
  }

  tagSelected = tag => {
    this.tagDeselected()

    let { tags, mapInstance, mapsApi, drawingManager } = this.state    
    , canDraw = true
    , shapeProps = {
      strokeColor: tag.color,
      strokeOpacity: 1,
      strokeWeight: 2,
      fillColor: tag.color,
      fillOpacity: 1,
      clickable: true,
      editable: true,
      suppressUndo: true,
      draggable: true,
      zIndex: 1,
    }

    drawingManager.setOptions({
      circleOptions: { ...shapeProps },
      polygonOptions: { ...shapeProps },
      rectangleOptions: { ...shapeProps },
    })

    tags.forEach(t => {
      if(t.id === tag.id) t.active = true
      else t.active = false
    })

    this.setState({ currentTag: tag, tags, canDraw }, () => {

      if(!tag.shapes.length){ // Fetch shapes if new/no shapes
        const url = '/api/v1/tags-influence'
        , params = { tags_ids: [tag.id] }

        this.http
        .get(url, params, auth)
        .then(res => {
          const results = res.data.tags
          if (results.length){
            // results.forEach(t => {
            const areas = results[0].areas
            areas.length && l(areas)
            areas.forEach(area => {
              let coords = area.geometry.coordinates, shape
              , bounds = new mapsApi.LatLngBounds()
  
              switch(area.properties.type){
                case "polygon": 
                  shape = new mapsApi.Polygon({
                    ...shapeProps,
                    map: mapInstance,
                    path: coords[0].map(p => new mapsApi.LatLng(p[1], p[0])),
                  })
                break;
                
                case "circle": 
                  shape = new mapsApi.Circle({
                    ...shapeProps,
                    map: mapInstance,
                    center: new mapsApi.LatLng(coords[1], coords[0]),
                    // radius: radius*100,
                    radius: area.properties.radius * 1,
                  })
                break;
                
                default: 
                  coords[0].forEach(p => bounds.extend(new mapsApi.LatLng(p[1], p[0])))
                  shape = new mapsApi.Rectangle({
                    ...shapeProps,
                    map: mapInstance,
                    bounds
                  })
                break;
              }
  
              this.addEventHandlers(shape, area.properties.type, "fetch", area.id)
            })
            // })
          }
        })
      } else { // Set shapes again if existing
        tag.shapes.forEach(s => {
          s.shape.setMap(mapInstance)
          s.outer.setMap(mapInstance)
        })
      }

    })    
  }
  
  tagDeleted = tag => {
    let { tags } = this.state
    , canDraw = false

    // Delete tags
    tags = tags.filter(t => t.id !== tag.id)
    this.setState({ tags, canDraw, currentTag: null })

    // Delete drawn shapes
    // currentTag = null
    tag.shapes.forEach(s => {
      s.shape.setMap(null)
      s.outer.setMap(null)
    })

    // Reset palette
    palette.filter(c => c.tagId === tag.id)[0].tagId = null
  }

  clearInfluence = shape => {
    l(shape)
  }

  save = () => {
    l("createArray", createArray)
    l("updateArray", updateArray)
    l("deleteArray", deleteArray)
  }

  render() {
    const { mapsApiLoaded, mapInstance, mapsApi, currentTag, tags, canDraw } = this.state
    return (
      <div className="map-outer">
        <nav className="navbar navbar-expand-lg navbar-dark">
          <a className="navbar-brand" id="sidebar-collapse" href="javascript:void(0)">
            <img src="assets/burger.svg" alt="" />
          </a>
          <div className="ml-auto">
            <ul className="navbar-nav">
              <li className="nav-item">
                <img className="avatar" src="assets/user-icon.png" alt="" />
                <span className="mx-3">{this.state.username}</span>
              </li>
              <li className="nav-item dropdown">
                <a className="nav-link dropdown-toggle" href="javascript:void(0)" data-toggle="dropdown">
                </a>
                <div className="dropdown-menu">
                  <a className="dropdown-item" onClick={this.logout} href="javascript:void(0)">Logout</a>
                </div>
              </li>
            </ul>
          </div>
        </nav>
        <div className="wrapper">
          {/* <div className="sidebar hidden" onClick={this.tagDeselected}>{ */}
          <div className="sidebar" onClick={this.tagDeselected}>{
            tags.length > 0 && tags.map((tag, idx) => {
              return (
                <div 
                  key={idx} 
                  className={`row mx-0 py-2 tag-row ${tag.active ? "active" : ""} `}
                  onClick={e => { sp(e); this.tagSelected(tag) }}
                  >
                  <div className="col-1">
                    <div 
                      className="tag-color"
                      style={{
                        border: `1px solid ${tag.color}`,
                        borderRadius: 2,
                        background: `${tag.color}`
                      }}
                    ></div>
                  </div>
                  <div className="col-2">{
                    tag.image ?
                    <img className="tag-img" src={tag.image} alt="" /> :
                    <img className="tag-img" src="assets/tag-plh.png" alt="" />
                  }</div>
                  <div className="col-7 tag-title p-0">{tag.full_name}</div>
                  <div className="col-1">
                    <img 
                      src="assets/delete-tag-black.svg" 
                      className="tag-delete" 
                      onClick={e => { sp(e); this.tagDeleted(tag) }}
                      alt=""/>
                  </div>
                </div>
              )
            })
            }{
            tags.length === 0 && <h4>No tags selected</h4>
          }</div>
          <div className="content">
            <GoogleMapReact
              options={{ streetViewControl: true }}
              bootstrapURLKeys={{ 
                libraries: ['drawing', 'geometry', 'places'],
                key: 'AIzaSyB977EFLp4w9wVttk6Ne7s1CejK9LQyvsQ' 
              }}
              defaultCenter={this.props.center}
              defaultZoom={this.props.zoom}
              onGoogleApiLoaded={({ map, maps }) => this.apiLoaded(map, maps)}
              yesIWantToUseGoogleMapApiInternals
              >{ 
                currentTag && currentTag.shapes.map((s, idx) => {
                  return (
                    s.selected ? <InfluenceBox
                    key={idx}
                    onClearInfluence={() => this.clearInfluence(s)}
                    lat={s.outer.getTopRight().lat()}
                    lng={s.outer.getTopRight().lng()}
                    text={`${s.influence} m`}
                  /> : null
                )
              })
            }</GoogleMapReact>
            <div className="search-bar" ref={this.searchplaces}>{ 
              mapsApiLoaded && 
              <SearchBox 
                map={mapInstance} 
                mapsApi={mapsApi} 
                onPlacesChanged={this.placesChanged} 
              />
            }</div>
            <div className="search-bar" ref={this.searchtags}>
              <AutoComplete
                inputProps={{
                  placeholder: 'Search for tags ...',
                }}
                optionSelected={this.tagAdded}
                // type="tag"
                // inputChanged={this.handleAutoInput}
                // getCurrSugg={this.handleSuggestions}
              />
            </div>
            <div className={`draw-shape ${canDraw ? "" : "disabled"}`} ref={this.drawshapes}>
              <div className="ctn-icon" onClick={() => this.startDrawing("polygon")}>
                <img className="pr" src="assets/edit-grey.svg" alt="" />
                <img className="sc" src="assets/edit-active.svg" alt="" />
              </div>
              <div className="ctn-icon" onClick={() => this.startDrawing("circle")}>
                <img className="pr" src="assets/circle-grey.svg" alt="" />
                <img className="sc" src="assets/circle-active.svg" alt="" />
              </div>
              <div className="ctn-icon" onClick={() => this.startDrawing("rectangle")}>
                <img className="pr" src="assets/square-grey.svg" alt="" />
                <img className="sc" src="assets/square-active.svg" alt="" />
              </div>
            </div>
            <button className="btn-accent" onClick={this.save} ref={this.savebtn}>
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }
}
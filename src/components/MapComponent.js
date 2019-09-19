/* eslint-disable no-script-url */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { Component } from 'react'
import $ from 'jquery'
import GoogleMapReact from 'google-map-react'
import { l, auth, generateColor, checkDuplicate, sp, rand, randBetween, findGroupById } from '../helpers/common'

import SearchBox from './SearchBox'
import AutoComplete from './AutoComplete'
import HttpService from '../services/HttpService'

const InfluenceBox = ({ text }) => {
  return (
    <div className="ctn-influence">
      {text}
      <img onClick={() => alert('clearInfluence')} src="assets/clear.svg" alt=""/>
    </div>
  )
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
// , currentTag = null
// , currentShape = null

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
    // center: {
    //   lat: 40.758896,
    //   lng: -73.985130
    // },
    center: {
      lat: 40.78343,
      lng: -73.96625
    },
    zoom: 14
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
    let { tags } = this.state
    map.controls[maps.ControlPosition.LEFT_TOP].push(this.searchtags.current)
    map.controls[maps.ControlPosition.LEFT_TOP].push(this.drawshapes.current)
    
    this.savebtn.current.index = -1
    map.controls[maps.ControlPosition.RIGHT_TOP].push(this.searchplaces.current)
    map.controls[maps.ControlPosition.RIGHT_BOTTOM].push(this.savebtn.current)
    
    maps.Rectangle.prototype.getCenter =  function() {
      let bounds = this.getBounds()
      return new maps.LatLng(
        (bounds.getSouthWest().lat() + bounds.getNorthEast().lat()) / 2,
        (bounds.getSouthWest().lng() + bounds.getNorthEast().lng()) / 2,
      )
    }
    maps.Rectangle.prototype.getTopRight = function () {
      // let bounds = this.getBounds()
      // return new maps.LatLng(
      //   (bounds.getSouthWest().lat() + bounds.getNorthEast().lat()) / 2,
      //   (bounds.getSouthWest().lng() + bounds.getNorthEast().lng()) / 2,
      // )
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
      // let arr = this.getPath().getArray()
      //   , distX = 0, distY = 0
      //   , len = arr.length

      // arr.forEach(element => {
      //   distX += element.lat()
      //   distY += element.lng()
      // })

      // return new maps.LatLng(distX / len, distY / len)
    }
    
    maps.Circle.prototype.getTopRight = function () {
      // let arr = this.getPath().getArray()
      //   , distX = 0, distY = 0
      //   , len = arr.length

      // arr.forEach(element => {
      //   distX += element.lat()
      //   distY += element.lng()
      // })

      // return new maps.LatLng(distX / len, distY / len)
    }

    maps.event.addListener(map, "click", () => {
      let { currentTag } = this.state      
      currentTag.shapes.forEach(s => s.selected = false)
      this.setState({ currentTag })
    })

    maps.event.addDomListener(document, "keyup", e => {
      if(e.target.tagName !== "INPUT"){
        const key = e.keyCode ? e.keyCode : e.which
        let { currentTag } = this.state      
        // l(key)        
        switch (key) {
          case 8:
            let selected = currentTag.shapes.filter(s => s.selected)
            if(selected.length){
              // Remove current shape from map
              selected[0].shape.setMap(null)
              selected[0].outer.setMap(null) 
              
              // Remove current shape from tag
              currentTag.shapes = currentTag.shapes.filter(s => s.shapeId !== selected[0].shapeId)
              
              // API request to delete shape: TODO

              this.setState({ currentTag })
            } else{              
              this.tagDeleted(currentTag)
            }
          break;
  
          default: break;
        }
      }
    })
    
    const drawingManager = new maps.drawing.DrawingManager({ map, drawingControl: false })
    maps.event.addListener(drawingManager, "polygoncomplete", shape => {
      this.addEventHandlers(shape, "polygon", "draw")
    })
    
    maps.event.addListener(drawingManager, "circlecomplete", shape => {
      this.addEventHandlers(shape, "circle", "draw")
    })

    maps.event.addListener(drawingManager, "rectanglecomplete", shape => {
      this.addEventHandlers(shape, "rectangle", "draw")
    })
    
    this.setState({
      mapsApiLoaded: true,
      mapInstance: map,
      mapsApi: maps,
      drawingManager
    })  
  }
  
  shapeSelected = shape => {
    let { currentTag } = this.state
    , currentShape = findGroupById(currentTag.shapes, shape.shapeId)

    currentTag.shapes.forEach(s => s.selected = false)
    currentShape.selected = true
    this.setState({ currentTag })
  }

  addEventHandlers = (shape, type, method) => {    
    let { mapsApi, mapInstance, currentTag, drawingManager } = this.state
    , shapeId = rand(8), outer, start
    
    drawingManager.setDrawingMode(null)
    shape.shapeId = shapeId
    shape.addListener("click", () => this.shapeSelected(shape))
    shape.addListener("drag", () => this.shapeSelected(shape))

    switch(type){
      case "polygon":
        let shape_points = shape.getPath().getArray()
        , outer_points = []
        
        start = shape.getCenter()
        shape_points.forEach(pt => {
          let np = mapsApi.geometry.spherical.interpolate(start, pt, 1.5)
          outer_points.push(np)
        })

        outer = new mapsApi.Polygon({
          strokeColor: currentTag.color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: currentTag.color,
          fillOpacity: 0.35,
          map: mapInstance,
          editable: true,
          suppressUndo: true,
          // draggable: true,
          path: outer_points,
          zIndex: 0
        })

        shape.getPath().addListener('insert_at', () => {
          // l('Vertex added.')
          let start = shape.getCenter()
          , shape_points = shape.getPath().getArray()
          , outer_points = []

          shape_points.forEach(pt => {
            let np = mapsApi.geometry.spherical.interpolate(start, pt, 1.5)
            outer_points.push(np)
          })

          outer.setPath(outer_points)
          this.shapeSelected(shape)
        })

        shape.getPath().addListener('set_at', () => {
          // l('Vertex moved')
          let start = shape.getCenter()
          , shape_points = shape.getPath().getArray()
          , outer_points = []

          shape_points.forEach(pt => {
            let np = mapsApi.geometry.spherical.interpolate(start, pt, 1.5)
            outer_points.push(np)
          })

          outer.setPath(outer_points)
          this.shapeSelected(shape)
        })
      break;

      case "circle":
        shape.addListener("radius_changed", () => {
          outer.setRadius(shape.getRadius() * 1.5)
          // outer.setRadius(shape.getRadius() + 3)
          this.shapeSelected(shape)
        })

        shape.addListener("center_changed", () => {
          outer.setCenter(shape.getCenter())
        })

        // Outer shape for circle
        outer = new mapsApi.Circle({
          strokeColor: currentTag.color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: currentTag.color,
          fillOpacity: 0.35,
          radius: shape.getRadius() * 1.5,
          // radius: shape.getRadius() + 3,
          center: shape.getCenter(),
          editable: true,
          suppressUndo: true,
          // draggable: true,
          map: mapInstance,
          zIndex: 0
        })

        outer.addListener("radius_changed", () => {
          // Change influence according to new radius
          
          this.shapeSelected(shape)          
        })

      break;
      
      default:
        shape.addListener("bounds_changed", () => {
          let start = shape.getCenter()
          , bounds = shape.getBounds()
            
          outer.setBounds(
            new mapsApi.LatLngBounds(
              mapsApi.geometry.spherical.interpolate(start, bounds.getSouthWest(), 1.5),
              mapsApi.geometry.spherical.interpolate(start, bounds.getNorthEast(), 1.5),
            )
          )

          this.shapeSelected(shape)
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

        start = shape.getCenter()
        let bounds = shape.getBounds()

        outer.setBounds(
          new mapsApi.LatLngBounds(
            mapsApi.geometry.spherical.interpolate(start, bounds.getSouthWest(), 1.5),
            mapsApi.geometry.spherical.interpolate(start, bounds.getNorthEast(), 1.5),
          )
        )

        outer.addListener("bounds_changed", () => {
          // Change influence and keep bounds in check here

          this.shapeSelected(shape)
        })

      break;
    }

    outer.shapeId = shapeId
    outer.addListener("click", () => this.shapeSelected(outer))

    currentTag.shapes.forEach(s => s.selected = false)
    currentTag.shapes.push({
      shapeId,
      shape: shape,
      outer: outer,
      influence: 30,
      selected: method === "fetch" ? false : true
    })
    this.setState({ currentTag })
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
          let results = res.data.tags
          , shapes = []
          tag.shapes = shapes
          
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
  
              this.addEventHandlers(shape, area.properties.type, "fetch")
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

  save = () => {
    l("save")
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
          {/* <nav className="sidebar hidden" onClick={this.tagDeselected}>{ */}
          <nav className="sidebar" onClick={this.tagDeselected}>{
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
          }</nav>
          <div className="content">
            <GoogleMapReact
              options={{ streetViewControl: true }}
              bootstrapURLKeys={{ 
                libraries: ['drawing', 'geometry', 'places'],
                key: 'AIzaSyB977EFLp4w9wVttk6Ne7s1CejK9LQyvsQ' 
              }}
              defaultCenter={this.props.center}
              defaultZoom={this.props.zoom}
              yesIWantToUseGoogleMapApiInternals
              onGoogleApiLoaded={({ map, maps }) => {
                this.apiLoaded(map, maps)
              }}
            >
              { currentTag && currentTag.shapes.map((s, idx) => {
                  return (
                    s.selected ? <InfluenceBox
                      key={idx}
                      lat={s.shape.getCenter().lat()}
                      lng={s.shape.getCenter().lng()}
                      text={`${s.influence}m`}
                    /> : null
                  )
                })
              }
            </GoogleMapReact>
            
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
import React from 'react'
import PropTypes from 'prop-types'
import Hotspot from './Hotspot'

class ImageHotspots extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      container: {
        width: undefined,
        height: undefined,
        ratio: undefined,
        orientation: undefined
      },
      image: {
        initialWidth: undefined,
        initialHeight: undefined,
        width: undefined,
        height: undefined,
        scale: undefined,
        ratio: undefined,
        orientation: undefined,
        offsetX: undefined,
        offsetY: undefined
      },
      minimap: {
        initialWidth: 100,
        initialHeight: 100,
        width: undefined,
        height: undefined,
        ratio: undefined,
        offsetX: 0,
        offsetY: 0
      },
      guide: {
        width: undefined,
        height: undefined,
        ratio: undefined,
      },
      hideFullscreenControl: false,
      hideZoomControls: false,
      hideHotspots: false,
      hideMinimap: false,
      resizable: undefined,
      draggable: undefined,
      cursorX: undefined,
      cursorY: undefined,
      mcursorX: undefined,
      mcursorY: undefined,
      dragging: undefined,
      isGuideDragging: undefined,
      hotspots: []
    }

    this.container = React.createRef()
  }

  componentDidMount = () => {
    const {
      hideFullscreenControl,
      hideZoomControls,
      hideHotspots,
      hideMinimap,
      hotspots
    } = this.props
    const { offsetWidth: width, offsetHeight: height } = this.container.current
    const orientation = (width > height) ? 'landscape' : 'portrait'
    const ratio = (orientation === 'landscape') ? width / height : height / width

    this.setState({
      container: { width, height, ratio, orientation },
      guide: { ratio },
      hideFullscreenControl,
      hideZoomControls,
      hideHotspots,
      hideMinimap,
      hotspots
    })

    window.addEventListener('resize', this.onWindowResize)
  }

  componentWillUnmount = () => {
    window.removeEventListener('resize', this.onWindowResize)
  }

  startDrag = (event, element) => {
    const cursorX = event.clientX
    const cursorY = event.clientY
    if (element === 'image') {
      this.setState(state => ({
        ...state,
        cursorX,
        cursorY,
        dragging: true
      }))
    } else if (element === 'guide') {
      this.setState(state => ({
        ...state,
        mcursorX: cursorX,
        mcursorY: cursorY,
        isGuideDragging: true
      }))
    }
    event.preventDefault()
  }

  whileDrag = (event) => {
    const { image, minimap } = this.state
    const cursorX = event.clientX
    const cursorY = event.clientY
    const deltaX = cursorX - this.state.cursorX
    const deltaY = cursorY - this.state.cursorY
    const newOffsetX = image.offsetX + deltaX
    const newOffsetY = image.offsetY + deltaY

    console.log(newOffsetX, newOffsetY)

    this.setState(state => ({
      ...state,
      cursorX,
      cursorY,
      image: {
        ...image,
        offsetX: newOffsetX,
        offsetY: newOffsetY
      },
      minimap: {
        ...minimap,
        // offsetX: newOffsetX > 0 ? 0 : -newOffsetX,
        // offsetY: newOffsetY > 0 ? 0 : -newOffsetY
        offsetX: -newOffsetX / (image.width/100),
        offsetY: -newOffsetY / (image.height/100)
      }
    }))
  }

  stopDrag = () => {
    const { container, image } = this.state
    const offsetXMax = container.orientation === image.orientation
      ? -Math.abs(image.width - container.width)
      : -Math.abs(container.width - image.width)
    const offsetYMax = container.orientation === image.orientation
      ? -Math.abs(container.height - image.height)
      : -Math.abs(image.height - container.height)
    const deltaX = container.width - image.width - image.offsetX
    const deltaY = container.height - image.height - image.offsetY

    this.setState(state => ({
      ...state,
      image: {
        ...state.image,
        offsetX: image.offsetX >= 0 ? 0 : deltaX >= 0 ? offsetXMax : image.offsetX,
        offsetY: image.offsetY >= 0 ? 0 : deltaY >= 0 ? offsetYMax : image.offsetY
      },
      minimap: {
        ...state.minimap,
        offsetX: image.offsetX >= 0 ? 0 : deltaX >= 0 ? offsetXMax : -image.offsetX / (image.width/100),
        offsetY: image.offsetY >= 0 ? 0 : deltaY >= 0 ? offsetYMax : -image.offsetY / (image.height/100)
      },
      dragging: false
    }))
  }

  onImageLoad = ({ target: image }) => {
    const { offsetWidth: initialWidth, offsetHeight: initialHeight } = image
    const { container, hideZoomControls, hideMinimap } = this.state
    const orientation = (initialWidth > initialHeight) ? 'landscape' : 'portrait'
    const ratio = (orientation === 'landscape')
      ? initialWidth / initialHeight
      : initialHeight / initialWidth

    const width = container.orientation === orientation
      ? orientation === 'landscape'
        ? ratio >= container.ratio
          ? container.width // landscape image bigger than landscape container
          : container.height * ratio // landscape image smaller than landscape container
        : ratio >= ratio
          ? container.height / ratio // portrait image bigger than portrait container
          : container.width // portrait image smaller than portrait container
      : orientation === 'landscape'
        ? container.width // landscape image and portrait container
        : container.height / ratio // portrait image and landscape container

    const height = container.orientation === orientation
      ? orientation === 'landscape'
        ? ratio >= container.ratio
          ? container.width / ratio // landscape image bigger than landscape container
          : container.height // landscape image smaller than landscape container
        : ratio >= container.ratio
          ? container.height // portrait image bigger than portrait container
          : container.width * ratio // portrait image smaller than portrait container
      : orientation === 'landscape'
        ? container.width / ratio // landscape image and portrait container
        : container.height // portrait image and landscape container

    const resizable = (initialWidth > width) || (initialHeight > height)

    this.setState((prevState) => ({
      image: {
        ...prevState.image,
        initialWidth,
        initialHeight,
        width,
        height,
        scale: 1,
        ratio,
        orientation,
        offsetX: 0,
        offsetY: 0
      },
      hideZoomControls: hideZoomControls || !resizable,
      hideMinimap: hideMinimap || !resizable,
      resizable,
      draggable: false
    }))
  }

  onWindowResize = () => {
    this.zoom(this.state.image.scale)
  }

  toggleFullscreen = () => {
    const { fullscreen } = this.state
    if (!fullscreen) {
      this.requestFullscreen(this.container.current)
      this.setState({ fullscreen: true })
    } else {
      this.exitFullscreen()
      this.setState({ fullscreen: false })
    }
  }

  zoom = (scale) => {
    if (scale > 0) {
      const { container, image } = this.state

      const width = container.orientation === image.orientation
        ? image.orientation === 'landscape'
          ? image.ratio >= container.ratio
            ? container.width * scale// landscape image bigger than landscape container
            : container.height * image.ratio * scale// landscape image smaller than landscape container
          : image.ratio >= container.ratio
            ? container.height / image.ratio * scale// portrait image bigger than portrait container
            : container.width * scale// portrait image smaller than portrait container
        : image.orientation === 'landscape'
          ? container.width * scale// landscape image and portrait container
          : container.height / image.ratio * scale// portrait image and landscape container

      const height = container.orientation === image.orientation
        ? image.orientation === 'landscape'
          ? image.ratio >= container.ratio
            ? container.width / image.ratio  * scale// landscape image bigger than landscape container
            : container.height  * scale// landscape image smaller than landscape container
          : image.ratio >= container.ratio
            ? container.height  * scale// portrait image bigger than portrait container
            : container.width * image.ratio  * scale// portrait image smaller than portrait container
        : image.orientation === 'landscape'
          ? container.width / image.ratio  * scale// landscape image and portrait container
          : container.height  * scale// portrait image and landscape container

      if (image.initialWidth > width && image.initialHeight > height) {
        this.setState((prevState) => ({
          image: {
            ...prevState.image,
            width,
            height,
            scale
          },
          draggable: scale > 1
        }))
      }

      // Reset image position
      if (scale === 1) {
        this.setState((prevState) => ({
          image: { ...prevState.image, offsetX: 0, offsetY: 0 }
        }))
      }
    }
  }

  requestFullscreen = (element) => {
    if (element.requestFullscreen) {
      element.requestFullscreen()
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen()
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen()
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen()
    }
  }

  exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen()
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen()
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen()
    }
  }

  render = () => {
    const { src, alt, hotspots } = this.props
    const {
      container,
      image,
      minimap,
      fullscreen,
      dragging,
      hideFullscreenControl,
      hideZoomControls,
      hideHotspots,
      hideMinimap,
      draggable
    } = this.state
    console.log('---')
    console.log(image.offsetX, image.offsetY)
    console.log(minimap.offsetX, minimap.offsetY)
    const imageLoaded = image.initialWidth && image.initialHeight

    const containerStyle = {
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      textAlign: 'center',
      background: '#eee'
    }

    const imageStyle = {
      position: 'relative',
      left: image.offsetX,
      top: image.offsetY
    }

    const hotspotsStyle = {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      margin: 'auto',
      pointerEvents: 'none'
    }

    const topControlsStyle = {
      position: 'absolute',
      top: 10,
      right: 10,
      pointerEvents: this.state.dragging ? 'none' : 'auto'
    }

    const bottomControlsStyle = {
      position: 'absolute',
      bottom: 10,
      right: 10,
      pointerEvents: this.state.dragging ? 'none' : 'auto'
    }

    const buttonStyle = {
      width: '25px',
      height: '25px',
      border: 'none',
      background: '#fff',
      boxShadow: '0px 0px 2px 0px rgba(0,0,0,0.5)'
    }

    const minimapStyle = {
      position: 'absolute',
      display: 'block',
      bottom: 10,
      left: 10,
      background: '#fff',
      boxShadow: '0px 0px 2px 0px rgba(0,0,0,0.5)'
    }

    const guideStyle = {
      position: 'absolute',
      display: 'block',
      left: minimap.offsetX,
      top: minimap.offsetY,
      border: '1px solid rgba(64, 139, 252, 0.8)',
      background: 'rgba(64, 139, 252, 0.1)'
    }

    if (imageLoaded) {
      if (container.orientation === 'landscape') {
        imageStyle.height = image.height
      } else {
        imageStyle.width = image.width
      }

      if (image.orientation === 'landscape') {
        hotspotsStyle.height = image.width / image.ratio
        hotspotsStyle.width = image.width

        minimapStyle.width = 100 * image.ratio
        minimapStyle.height = 100

        guideStyle.width = (container.width >= image.width)
          ? 100 * image.ratio
          : (100 * image.ratio) / (image.width / container.width)
        guideStyle.height = 100 / image.scale
      } else {
        hotspotsStyle.height = image.height
        hotspotsStyle.width = image.height / image.ratio

        minimapStyle.width = 100
        minimapStyle.height = 100 * image.ratio

        guideStyle.width = (container.width >= image.width)
          ? 100
          : 100 / (image.width / container.width)
        guideStyle.height = 100 * image.ratio / image.scale
      }
    }
    return (
      <div ref={this.container} style={containerStyle} onMouseOut={this.stopDrag}>
        {
          src &&
          <img
            src={src}
            alt={alt}
            title={alt}
            onLoad={this.onImageLoad}
            style={imageStyle}
            onMouseDown={evt =>{
              if (draggable && !hideZoomControls) {
                this.startDrag(evt, 'image')
              }
            }}
            onMouseMove={evt => {
              if (!hideZoomControls && dragging) {
                this.whileDrag(evt)
              }
            }}
            onMouseUp={this.stopDrag}
          />
        }
        {
          !hideHotspots && hotspots &&
          <div style={hotspotsStyle}>
            {
              hotspots.map(({ x, y, content }) => {
                return <Hotspot x={x} y={y} style={hotspotsStyle} offsetX={image.offsetX} offsetY={image.offsetY} content={content} />
              })
            }
          </div>
        }
        {
          !hideFullscreenControl &&
            <div style={topControlsStyle}>
              <button style={buttonStyle} onClick={() => this.toggleFullscreen()}>
                {fullscreen ? 'X' : 'FS'}
              </button>
            </div>
        }
        {
          !hideZoomControls &&
            <>
              <div style={bottomControlsStyle}>
                <button style={buttonStyle} onClick={() => this.zoom(1)}>Fit</button>
                <br />
                <br />
                <button style={buttonStyle} onClick={() => this.zoom(image.scale + 1)}>+</button>
                <br />
                <button style={buttonStyle} onClick={() => this.zoom(image.scale - 1)}>-</button>
              </div>
              {
                !hideMinimap &&
                  <div style={minimapStyle}>
                    { src &&
                    <img src={src} width={minimapStyle.width} height={minimapStyle.height} />
                    }
                    <div style={guideStyle} />
                  </div>
              }
            </>
        }
      </div>
    )
  }
}

ImageHotspots.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  hotspots: PropTypes.array
}

export default ImageHotspots

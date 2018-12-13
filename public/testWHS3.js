var photos = [];
// A react component for a tag
class Tag extends React.Component {
    render() {
        return React.createElement('p',  // type
            {className: 'tagText', id: this.props.idkey+'tag'}, // properties
            this.props.text);  // contents
    }
};

class TagWrap extends React.Component {
    constructor(props) {
        super(props);
        this.rmTag = this.rmTag.bind(this);
    }

    rmTag(e) {
        e.stopPropagation();
        console.log('rm tag');
        var tagText = document.getElementById(this.props.idkey+'tag').textContent;
        this.props.regenTag(e, tagText);
        var idNum = this.props.idkey.split('%')[0];
        var url = 'rmtag=' + idNum + '+' + tagText;
        var request = new XMLHttpRequest();
        request.open('GET', url);
        request.responseType = 'text';
        request.addEventListener('load', function() {
            if (this.status == 200)
                window.dispatchEvent(new Event('resize')); /* The world is held together with duct tape */
            else
                console.log("XHR Error!", this.responseText);
        });
        request.send();
    }

    render() {
        return React.createElement('div', {className: 'tagDiv'},
                    React.createElement(Tag, {text: this.props.text, idkey: this.props.idkey}),
                        React.createElement('button', {className: 'rmButt', onClick: this.rmTag},
                            React.createElement('i',{className: 'material-icons'}, 'close')));
    }
}

class AddTag extends React.Component {
    constructor(props) {
        super(props);
        this.addTag = this.addTag.bind(this);
    }

    inputClick(e) {
        e.stopPropagation();
        console.log('input clicked');
    }

    addTag(e) {
        e.stopPropagation();
        console.log('add tag');
        var inputTag = document.getElementById(this.props.idNum+'input').value;
        if (!inputTag || !/^[a-z A-Z]+$/.test(inputTag))
            return;

        inputTag = inputTag.trim();
        this.props.regenTag(e, inputTag);
        var url = 'addtag=' + this.props.idNum + '+' + inputTag;
        var request = new XMLHttpRequest();
        request.open('GET', url);
        request.responseType = 'text';
        request.addEventListener('load', function() {
            if (this.status == 200)
                window.dispatchEvent(new Event('resize')); /* The world is held together with duct tape */
            else
                console.log("XHR Error!", this.responseText);
        });
        request.send();
    }

    render() {
        return React.createElement('div', {className: 'addTag'},
                    React.createElement('input',
                        {onClick: this.inputClick, className: 'inputText', id: this.props.idNum+'input'}),
                            React.createElement('button',
                                {onClick: this.addTag, className: 'add', idNum: this.props.idNum}, '+'));
    }
};

// A react component for controls on an image tile
class TileControl extends React.Component {
    constructor(props) {
        super(props);
        this.state = {tags: this.props.tags};
        this.addTag = this.addTag.bind(this);
        this.rmTag = this.rmTag.bind(this);
    }

    addTag(event, newTag) {
        var temp = this.state.tags;
        temp += ',' + newTag;
        this.setState({tags: temp});
    }

    rmTag(event, target) {
        var temp = this.state.tags.split(',');
        for (var i = 0; i < temp.length; i++) {
          if (temp[i] == target)
            break;
        }

        temp.splice(i, 1);
        this.setState({tags: temp.join(',')});
    }

    render() {
    // remember input vars in closure
        var _selected = this.props.selected;
        var _src = this.props.src;
        var _tags = this.state.tags.split(',');
        // parse image src for photo name

        var args = [];
        // args.push(React.createElement('div', { className: _selected ? 'selectedControls' : 'normalControls'}));
        args.push('div');
        args.push({ className: _selected ? 'selectedControls' : 'normalControls'});
        for (let i = 0; i < _tags.length; i++)
            args.push(React.createElement(TagWrap, {regenTag: this.rmTag, text: _tags[i], idkey: this.props.idNum+'%'+i}));

        if (_tags.length < 7)
            args.push(React.createElement(AddTag, {regenTag: this.addTag, idNum: this.props.idNum}));

        return (React.createElement.apply(null, args));
    } // render
};


// A react component for an image tile
class ImageTile extends React.Component {

    render() {
    // onClick function needs to remember these as a closure
    var _onClick = this.props.onClick;
    var _index = this.props.index;
    var _photo = this.props.photo;
    var _selected = _photo.selected; // this one is just for readability

    return (
        React.createElement('div',
            {style: {margin: this.props.margin, width: _photo.width},
            className: 'tile',
            onClick: function onClick(e) {
                console.log("tile onclick");
                // call Gallery's onclick
                return _onClick (e, {index: _index, photo: _photo })
            }
         }, // end of props of div
         // contents of div - the Controls and an Image
        React.createElement(TileControl,
            {selected: _selected,
             tags: _photo.tags,
             src: _photo.src,
             idNum: _photo.idNum}),
        React.createElement('img',
            {className: _selected ? 'selected' : 'normal',
                     src: _photo.src,
             width: _photo.width,
                     height: _photo.height}))//createElement div
    ); // return
    } // render
} // class



// The react component for the whole image gallery
// Most of the code for this is in the included library
class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {photos: photos};
    this.selectTile = this.selectTile.bind(this);
  }

  selectTile(event, obj) {
    console.log("in onclick!", obj);
    let photos = this.state.photos;
    photos[obj.index].selected = !photos[obj.index].selected;
    this.setState({photos: photos});
  }

  // rebuild() {
  //   this.setState({ photos: photos });
  // }

  render() {
    return (React.createElement(Gallery,
        {photos: this.state.photos,
        onClick: this.selectTile,
        ImageComponent: ImageTile}));
  }
}


class Popup extends React.Component {
    constructor(props) {
        super(props);
        this.state = {chosen:'', options:''};
        this.choose = this.choose.bind(this);
        this.unchoose = this.unchoose.bind(this);
    }

    choose(e, chosen) {
        this.setState({chosen: chosen});
        if (!chosen){
            popupContainer.style.display = 'none';
        }
    }

    unchoose(e, disgard) {
        document.getElementById('tags').value = '';
        var temp = this.state.chosen.split(',');
        temp.push(disgard);
        if (!temp[0]){
            temp.splice(0,1);
        }

        this.setState({chosen: temp.join(','), options: ''});
    }

    render() {
        return (React.createElement('div', {id: 'popupthing'},
            React.createElement(Chosen, {tags: this.state.chosen, regenTag: this.choose}),
            React.createElement(Options, {tags: this.state.options, regenTag: this.unchoose})));
                // return (React.createElement(Chosen, {tags: this.state.chosen, regenTag: this.choose}));
    }
}

class Chosen extends React.Component {
    constructor(props) {
        super(props);
        // this.state = {tags: this.props.tags};
        this.choose = this.choose.bind(this);
    }

    choose(e, ind) {
        var temp = this.props.tags.split(',');
        var disgard = temp[ind];
        temp.splice(ind,1);
        this.props.regenTag(e, temp.join(','));
    }

    render() {
        var args = [];
        args.push('div')
        args.push({id: 'chosen'});
        var _tags = this.props.tags.split(',');
        if (_tags[0] == '')
            _tags.splice(0,1);

        for (let i = 0; i < _tags.length; i++)
            args.push(React.createElement(ChosenTag, {text: _tags[i], idkey: 'c'+i, regenTag: this.choose}));

        return (React.createElement.apply(null, args));
    }
}

class ChosenTag extends React.Component {
    constructor(props) {
        super(props);
        this.rmTag = this.rmTag.bind(this);
    }

    rmTag(e) {
        console.log('rm tag');
        this.props.regenTag(e, this.props.idkey.split('c')[1]);
    }

    render() {
        return (React.createElement('div', {className: 'tagDiv'},
                    React.createElement(Tag, {text: this.props.text, idkey: this.props.idkey}),
                        React.createElement('button', {className: 'rmButt', onClick: this.rmTag},
                            React.createElement('i', {className: 'material-icons'}, 'close'))));
    }
}

class Options extends React.Component {
    constructor(props) {
        super(props);
        // this.state = {tags: this.props.tags};
        this.unchoose = this.unchoose.bind(this);
    }

    unchoose(e, ind) {
        var temp = this.props.tags.split(',');
        this.props.regenTag(e, temp[ind]);
    }

    render() {
        var args = [];
        args.push('div')
        args.push({id: 'option'});
        var _tags = this.props.tags.split(',');
        if (_tags[0] == '')
            _tags.splice(0,1);

        for (let i = 0; i < _tags.length; i++)
            args.push(React.createElement(OptionTag, {text: _tags[i], idkey: 'o'+i, regenTag: this.unchoose}));

        return (React.createElement.apply(null, args));
    }
}

class OptionTag extends React.Component {
    constructor(props) {
        super(props);
        this.rmTag = this.rmTag.bind(this);
    }

    rmTag(e) {
        console.log('rm tag');
        this.props.regenTag(e, this.props.idkey.split('o')[1]);
    }

    render() {
        return (React.createElement('div', {className: 'tagDiv'},
                    React.createElement(Tag, {text: this.props.text, idkey: this.props.idkey}),
                        React.createElement('button', {className: 'add', onClick: this.rmTag}, '+')));
    }
}


function inputCount() {
    var input = document.getElementById('tags').value;
    if (input.length == 2) {
        autoComplete();
    }

    if (input.length > 2) {
        var temp = dropDown.state.options.split(',');
        for (let i = 0; i < temp.length; i++) {
            if (!temp[i].toLowerCase().startsWith(input.toLowerCase())){
                temp.splice(i,1);
                i--;
            }
        }

        dropDown.setState({options: temp.join(',')});
    }


    if (input.length < 2 && !dropDown.state.chosen) {
        popupContainer.style.display = 'none';
    }
}


function autoComplete() {
    document.getElementById("initmsg").style.display = 'none';
    popupContainer.style.display = 'flex';
    var prefix = document.getElementById('tags').value;
    var url = 'query?autocomplete=' + prefix;
    var request = new XMLHttpRequest();
    request.open('GET', url);
    request.responseType = 'text';
    request.addEventListener('load', function () {
        if (this.status == 200)
        {
            var tags = JSON.parse(this.responseText).tags;
            dropDown.setState({options: Object.keys(tags).join(',')});
            window.dispatchEvent(new Event('resize')); /* The world is held together with duct tape */
        }
        else
            console.log("XHR Error!", this.responseText);
    });
    request.send();
}

// Called when the user pushes the "submit" button
function photoByTags() {
    popupContainer.style.display = 'none';
    var input = dropDown.state.chosen;
    dropDown.setState({chosen: ''});
    if (!input)
        return;

    input = input.split(',').join('+');
    var url = 'query?keyList=' + input;
    var request = new XMLHttpRequest();
    request.open('GET', url);
    request.responseType = 'text';
    request.addEventListener('load', function () {
        if (this.status == 200)
        {
            photos = JSON.parse(this.responseText).photos;
            for (let i = 0; i < photos.length; i++)
                photos[i].src = 'http://lotus.idav.ucdavis.edu/public/ecs162/UNESCO/' + encodeURIComponent(photos[i].src);

            reactApp.setState({photos: photos});
            window.dispatchEvent(new Event('resize')); /* The world is held together with duct tape */
        }
        // photos = JSON.parse(this.responseText);
        // console.log(photos);
        // ReactDOM.render(React.createElement(App),reactContainer);
        else
            console.log("XHR Error!", this.responseText);
    });
    request.send();
}

/* Finally, we actually run some code */
const reactContainer = document.getElementById("react");
const popupContainer = document.getElementById("popup");
var reactApp = ReactDOM.render(React.createElement(App),reactContainer);
var dropDown = ReactDOM.render(React.createElement(Popup), popupContainer);
/* Workaround for bug in gallery where it isn't properly arranged at init */
window.dispatchEvent(new Event('resize'));
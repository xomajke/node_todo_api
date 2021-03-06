const express = require('express');

const _ = require('lodash');

const {ObjectID} = require('mongodb');
const {mongoose} = require('./../db/mongoose');
const {Todo} = require('./../models/todo');
const {User} = require('./../models/user');
const {authenticate} = require('../middleware/authenticate');

const TodoRoutes = express.Router();

TodoRoutes.post('/todos', authenticate, (req, res) => {
  let todo = new Todo({
    text: req.body.text,
    _creator: req.user._id
  });

  todo.save().then(
    (doc) => res.send(doc),
    (err) => res.status(400).send(err)
  );
});

TodoRoutes.get('/todos', authenticate, (req, res) => {
  Todo.find({_creator: req.user._id}).then(
    (todos) => res.send({todos}),
    (err) => res.status(400).send(err)
  );
});

TodoRoutes.get('/todos/:id', authenticate, (req, res) => {
  let id = req.params.id;

  if(!ObjectID.isValid(id)){
    return res.status(404).send({Error: 'Id is not valid'});
  }

  Todo.findOne({
    _id: id,
    _creator: req.user._id
  }).then((todo) => {
    if(!todo){
      return res.status(404).send();
    }

    return res.send({todo});
  }).catch((err) => res.status(400).send());
});

TodoRoutes.delete('/todos/:id', authenticate, (req, res) => {
  let id = req.params.id;

  if(!ObjectID.isValid(id)){
    return res.status(404).send();
  }

  Todo.findOneAndRemove({
    _id: id,
    _creator: req.user._id
  }).then((todo) => {
    if(!todo){
      return res.status(404).send();
    }

    res.send({todo});
  }).catch((err) => res.status(400).send());
});

TodoRoutes.patch('/todos/:id', authenticate, (req, res) => {
  let id = req.params.id;
  let body = _.pick(req.body, ['text', 'completed']);

  if(!ObjectID.isValid(id)){
    return res.status(404).send();
  }

  if(_.isBoolean(body.completed) && body.completed){
    body.completedAt = new Date().getTime();
  } else {
    body.completed = false;
    body.completedAt = null;
  }

  Todo.findOneAndUpdate({_id: id, _creator: req.user._id}, {$set: body}, {new: true}).then((todo) => {
    if(!todo){
      return res.status(404).send();
    }

    res.send({todo});
  }).catch((err) => res.status(400).send());
});

TodoRoutes.post('/users', (req, res) => {
  let body = _.pick(req.body, ['email', 'password']);
  let new_user = new User(body);

  new_user.save().then(() => {
    return new_user.generateAuthToken();
  }).then((token) => {
    res.header('x-auth', token).send(new_user);
  }).catch((err) => res.status(400).send(err));
});

TodoRoutes.get('/users/me', authenticate, (req, res) => {
  res.send(req.user);
});

TodoRoutes.post('/users/login', (req, res) => {
  let body = _.pick(req.body, ['email', 'password']);

  User.findByCredentials(body.email, body.password).then((user) => {
    user.generateAuthToken().then((token) => {
      res.header('x-auth', token).send(user);
    });
  }).catch((err) => res.status(400).send());
});

TodoRoutes.delete('/users/me/token', authenticate, (req, res) => {
  req.user.removeToken(req.token).then(
    () => res.status(200).send(),
    () => res.status(400).send()
  );
});

module.exports = {TodoRoutes};
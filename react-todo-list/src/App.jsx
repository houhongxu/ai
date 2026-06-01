import { useState, useEffect } from 'react'
import './App.css'

const STORAGE_KEY = 'react-todo-list-todos'

function loadTodos() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

export default function App() {
  const [todos, setTodos] = useState(loadTodos)
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'active' | 'completed'

  useEffect(() => {
    saveTodos(todos)
  }, [todos])

  function addTodo(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setTodos([
      ...todos,
      { id: Date.now(), text, completed: false },
    ])
    setInput('')
  }

  function toggleTodo(id) {
    setTodos(todos =>
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    )
  }

  function deleteTodo(id) {
    setTodos(todos => todos.filter(todo => todo.id !== id))
  }

  function clearCompleted() {
    setTodos(todos => todos.filter(todo => !todo.completed))
  }

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  const totalCount = todos.length
  const activeCount = todos.filter(t => !t.completed).length
  const completedCount = todos.filter(t => t.completed).length

  return (
    <div className="todo-app">
      <h1>待办事项</h1>

      <form className="todo-form" onSubmit={addTodo}>
        <input
          type="text"
          className="todo-input"
          placeholder="输入新的待办事项..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button type="submit" className="todo-add-btn">添加</button>
      </form>

      <div className="todo-stats">
        <span>总计: {totalCount}</span>
        <span>未完成: {activeCount}</span>
        <span>已完成: {completedCount}</span>
      </div>

      <div className="todo-filters">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >全部</button>
        <button
          className={filter === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
        >未完成</button>
        <button
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >已完成</button>
      </div>

      {filteredTodos.length === 0 ? (
        <p className="todo-empty">暂无待办事项</p>
      ) : (
        <ul className="todo-list">
          {filteredTodos.map(todo => (
            <li key={todo.id} className={todo.completed ? 'completed' : ''}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />
              <span className="todo-text">{todo.text}</span>
              <button
                className="todo-delete-btn"
                onClick={() => deleteTodo(todo.id)}
              >删除</button>
            </li>
          ))}
        </ul>
      )}

      {completedCount > 0 && (
        <button className="todo-clear-btn" onClick={clearCompleted}>
          清空已完成
        </button>
      )}
    </div>
  )
}

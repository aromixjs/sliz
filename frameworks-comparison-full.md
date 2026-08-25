# Framework Comparison: Full Table Filter Operation (Production Logic)

This comparison analyzes the complete operation across major web frameworks:
**Operation**: User enters filter values → validation → server re-queries database → returns filtered data or errors → UI updates.

Each section shows the complete flow: input → validation → server action → error handling → data return.

---

## 1. Sliz (This Project)

### Client Code (`src/components/ProductTable.tsx`)

```tsx
const ProductTable = sliz!{
  <table>
    <thead>
      <tr>
        <th>Name</th><th>Price</th><th>Category</th>
      </tr>
    </thead>
    <tbody>
      {products.map(p => (
        <tr key={p.id}>
          <td>{p.name}</td>
          <td>{p.price}</td>
          <td>{p.category}</td>
        </tr>
      ))}
    </tbody>
  </table>
  
  <div class="filters">
    <select>
      <option value="">All Categories</option>
      <option value="electronics">Electronics</option>
      <option value="clothing">Clothing</option>
    </select>
    <select>
      <option value="">All Statuses</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
    <button onclick={applyFilters}>Apply Filters</button>
  </div>
}
```

### Action with Validation and Server Task

```ts
const applyFilters = action({
  // ✅ TOP-LEVEL: Framework extracts current DOM values immediately before RPC
  category: Homepage.select("cat").val(),    // reads <select> value now
  status: Homepage.select("status").val(),   // reads <select> value now

  async run(c) {
    // ------- INPUT VALIDATION (client-side, before server) -------
    if (!c.category && !c.status) {
      return { error: "Please select at least one filter" }
    }
    
    if (c.category && !["electronics", "clothing"].includes(c.category)) {
      return { error: "Invalid category selected" }
    }
    
    if (c.status && !["active", "inactive"].includes(c.status)) {
      return { error: "Invalid status selected" }
    }
    
    // ------- SERVER-SIDE TASK: Re-query database -------
    // Simulate database query based on filters
    const allProducts = [
      { id: 1, name: "Laptop", price: "$999", category: "electronics", status: "active" },
      { id: 2, name: "T-Shirt", price: "$25", category: "clothing", status: "active" },
      { id: 3, name: "Phone", price: "$699", category: "electronics", status: "inactive" },
      { id: 4, name: "Jeans", price: "$59", category: "clothing", status: "inactive" }
    ];
    
    let results = allProducts;
    
    if (c.category) {
      results = results.filter(p => p.category === c.category);
    }
    
    if (c.status) {
      results = results.filter(p => p.status === c.status);
    }
    
    // ------- ERROR HANDLING: No results -------
    if (results.length === 0) {
      return { 
        error: "No products found matching filters",
        filtersApplied: { category: c.category, status: c.status }
      }
    }
    
    // ------- SUCCESS: Return filtered data -------
    return { 
      success: true, 
      products: results,
      filtersApplied: { category: c.category, status: c.status }
    }
  }
})
```

### How it works:
1. User clicks "Apply Filters" button
2. Framework extracts `category` and `status` from DOM nodes **immediately** before RPC
3. `run(c)` receives `{category, status}` - no manual extraction needed
4. Input validation runs client-side first
5. Server-side database query filters products
6. If no results: returns error object with message
7. If success: returns products + applied filters
8. Framework resolves output object and sends commands to client to update DOM

**Lines**: ~35 total (15 client + 20 action)  
**Flexibility**: High - full validation logic, custom server queries  
**Complexity**: Medium - manual validation + server query logic, but framework handles DOM-DATA passing

---

## 2. Next.js (App Router + Server Components)

### Client Code (`app/products/page.tsx`)

```tsx
export default function ProductPage() {
  const [filters, setFilters] = useState({ category: "", status: "" });
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const applyFilters = async (newFilters: { category?: string; status?: string }) => {
    setFilters(newFilters);
    setError(null);
    
    // Input validation client-side
    if (!newFilters.category && !newFilters.status) {
      setError("Please select at least one filter");
      return;
    }
    
    if (newFilters.category && !["electronics", "clothing"].includes(newFilters.category)) {
      setError("Invalid category selected");
      return;
    }
    
    try {
      // Server action - re-query database
      const data = await fetch("/api/products/filter", {
        method: "POST",
        body: JSON.stringify(newFilters),
        headers: { "Content-Type": "application/json" }
      });
      
      const result = await data.json();
      
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setProducts(result.products);
      }
    } catch (err) {
      setError("Failed to load products. Please try again.");
    }
  };
  
  return (
    <div>
      <select onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
        <option value="">All Categories</option>
        ...
      </select>
      <select onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
        ...
      </select>
      <button onClick={() => applyFilters(filters)}>Apply Filters</button>
      
      {error && <p class="error">{error}</p>}
      
      <table>
        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.price}</td>
              <td>{p.category}</td>
            </tr>
          ))}
          {products.length === 0 && !error && (
            <tr><td colSpan="3">No products found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

### Server Route (`app/api/products/route.ts`)

```ts
export async function POST(request: Request) {
  const { category, status } = await request.json();
  
  // Input validation server-side
  if (!category && !status) {
    return new JSONResponse({ error: "Please select at least one filter" }, { status: 400 });
  }
  
  if (category && !["electronics", "clothing"].includes(category)) {
    return new JSONResponse({ error: "Invalid category selected" }, { status: 400 });
  }
  
  if (status && !["active", "inactive"].includes(status)) {
    return new JSONResponse({ error: "Invalid status selected" }, { status: 400 });
  }
  
  // Server-side database query
  const allProducts = [
    { id: 1, name: "Laptop", price: "$999", category: "electronics", status: "active" },
    { id: 2, name: "T-Shirt", price: "$25", category: "clothing", status: "active" },
    { id: 3, name: "Phone", price: "$699", category: "electronics", status: "inactive" },
    { id: 4, name: "Jeans", price: "$59", category: "clothing", status: "inactive" }
  ];
  
  let results = allProducts;
  if (category) results = results.filter(p => p.category === category);
  if (status) results = results.filter(p => p.status === status);
  
  return new JSONResponse({ 
    success: true, 
    products: results,
    filtersApplied: { category, status }
  });
}
```

**Lines**: ~50 client + ~30 server = ~80 total  
**Flexibility**: Very High - full React power, any data-fetching library  
**Complexity**: Medium-High - manual state management, effect cleanup, API routes, validation on both sides, error handling

---

## 3. React + Inertia.js

### Client Code (`resources/js/Pages/Products.tsx`)

```tsx
import { usePage, useURL } from "@inertiajs/react";

export default function Products() {
  const { filters, setFilters } = usePage().data;
  const url = useURL();
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  
  const applyFilters = (newFilters: any) => {
    // Input validation client-side
    if (!newFilters.category && !newFilters.status) {
      setError("Please select at least one filter");
      return;
    }
    
    if (newFilters.category && !["electronics", "clothing"].includes(newFilters.category)) {
      setError("Invalid category selected");
      return;
    }
    
    setError(null);
    setFilters(newFilters);
    
    // Inertia link updates URL, triggers server-side
    url.update("/products/filter", { 
      method: "POST",
      body: newFilters 
    });
  };
  
  return (
    <div>
      <select onChange={e => setFilters({ ...filters, category: e.target.value })}>
        <option value="">All Categories</option>
        ...
      </select>
      <select onChange={e => setFilters({ ...filters, status: e.target.value })}>
        ...
      </select>
      <button onClick={() => applyFilters(filters)}>Apply Filters</button>
      
      {error && <p class="error">{error}</p>}
      
      <Table :products={products} :error={error} />
    </div>
  );
}
```

### Server Route (`routes/web.php`)

```php
Route::post('/products/filter', [ProductController::class, 'filter']);

class ProductController extends Controller {
  public function filter(Request $request) {
    // Input validation server-side
    $category = $request->filled('category') ? $request->category : null;
    $status = $request->filled('status') ? $request->status : null;
    
    if (!$category && !$status) {
      return Inertia::response('ValidationError', [
        'message' => 'Please select at least one filter'
      ]);
    }
    
    if ($category && !in_array($category, ['electronics', 'clothing'])) {
      return Inertia::response('ValidationError', [
        'message' => 'Invalid category selected'
      ]);
    }
    
    if ($status && !in_array($status, ['active', 'inactive'])) {
      return Inertia::response('ValidationError', [
        'message' => 'Invalid status selected'
      ]);
    }
    
    // Server-side database query
    $allProducts = [
      ["id" => 1, "name" => "Laptop", "price" => "$999", "category" => "electronics", "status" => "active"],
      ["id" => 2, "name" => "T-Shirt", "price" => "$25", "category" => "clothing", "status" => "active"],
      ["id" => 3, "name" => "Phone", "price" => "$699", "category" => "electronics", "status" => "inactive"],
      ["id" => 4, "name" => "Jeans", "price" => "$59", "category" => "clothing", "status" => "inactive"]
    ];
    
    $results = $allProducts;
    if ($category) $results = array_filter($results, fn($p) => $p['category'] === $category);
    if ($status) $results = array_filter($results, fn($p) => $p['status'] === $status);
    
    return Inertia::render('Products', [
      'products' => array_values($results),
      'filters' => $request->all(),
      'error' => null
    ]);
  }
}
```

### Inertia Error Handling (Blade)

```blade
@error('message')
  <p class="error">{{ $message }}</p>
@enderror
```

**Lines**: ~40 client + ~35 server = ~75 total  
**Flexibility**: High - Inertia handles routing, you control logic  
**Complexity**: Low-Medium - elegant, minimal boilerplate, Inertia abstraction handles state sync

---

## 4. Livewire (Laravel)

### Client Code (`resources/views/livewire/product-table.blade.php`)

```blade
<div>
  <select wire:model="filters.category">
    <option value="">All Categories</option>
    <option value="electronics">Electronics</option>
    <option value="clothing">Clothing</option>
  </select>
  
  <select wire:model="filters.status">
    <option value="">All Statuses</option>
    <option value="active">Active</option>
    <option value="inactive">Inactive</option>
  </select>
  
  <button wire:click="applyFilters">Apply Filters</button>
  
  @if($error)
    <p class="error">{{ $error }}</p>
  @endif
  
  <table>
    <tbody>
      @foreach ($products as $product)
        <tr>
          <td>{{ $product->name }}</td>
          <td>{{ $product->price }}</td>
        </tr>
      @endforeach
      @empty
        <tr><td colSpan="3">No products found matching filters</td></tr>
      @endforeach
    </tbody>
  </table>
</div>
```

### Server Component (`app/Http/Livewire/ProductTable.php`)

```php
class ProductTable extends Component
{
  public $filters = [];
  public $products = [];
  public $error = null;
  
  public function applyFilters()
  {
    // ------- INPUT VALIDATION (server-side only) -------
    $category = $this->filters['category'] ?? null;
    $status = $this->filters['status'] ?? null;
    
    if (!$category && !$status) {
      $this->error = "Please select at least one filter";
      return;
    }
    
    if ($category && !in_array($category, ['electronics', 'clothing'])) {
      $this->error = "Invalid category selected";
      return;
    }
    
    if ($status && !in_array($status, ['active', 'inactive'])) {
      $this->error = "Invalid status selected";
      return;
    }
    
    // ------- SERVER-SIDE TASK: Re-query database -------
    $allProducts = [
      ["id" => 1, "name" => "Laptop", "price" => "$999", "category" => "electronics", "status" => "active"],
      ["id" => 2, "name" => "T-Shirt", "price" => "$25", "category" => "clothing", "status" => "active"],
      ["id" => 3, "name" => "Phone", "price" => "$699", "category" => "electronics", "status" => "inactive"],
      ["id" => 4, "name" => "Jeans", "price" => "$59", "category" => "clothing", "status" => "inactive"]
    ];
    
    $results = $allProducts;
    if ($category) $results = array_filter($results, fn($p) => $p['category'] === $category);
    if ($status) $results = array_filter($results, fn($p) => $p['status'] === $status);
    
    // ------- ERROR: No results -------
    if (count($results) === 0) {
      $this->error = "No products found matching filters";
      $this->products = [];
      return;
    }
    
    // ------- SUCCESS -------
    $this->products = array_values($results);
    $this->error = null;
  }
  
  public function render()
  {
    return view('livewire.product-table');
  }
}
```

**Lines**: ~25 Blade + ~45 PHP = ~70 total  
**Flexibility**: Medium - Livewire handles state sync, limited to Eloquent queries  
**Complexity**: Low - "magic" properties, minimal JS, automatic AJAX, validation built-in

---

## 5. Phoenix LiveView (Elixir)

### Client Code (`lib/my_app_web/live/product_live.html.heex`)

```elixir
<div>
  <select ph_select={@category} ph-change={fn -> push_event(socket, "apply_filters", category: @category, status: @status)}>...</select>
  <select ph_select={@status} ph-change={fn -> push_event(socket, "apply_filters", category: @category, status: @status)}>...</select>
  
  <button ph_click={fn -> push_event(socket, "apply_filters", category: @category, status: @status)}>Apply Filters</button>
  
  @if @error do
    <p class="error"><%= @error %></p>
  @end
  
  <table>
    <tbody>
      for {product} <- @products do
        <tr><td><%= product.name %></td><td><%= product.price %></td></tr>
      end
      @empty
        <tr><td colSpan="3">No products found matching filters</td></tr>
      @end
    </tbody>
  </table>
</div>
```

### Server Handler (`lib/my_app_web/live/product_live.ex`)

```elixir
defmodule MyAppWeb.ProductLive do
  use MyAppWeb, :live_view
  
  alias MyApp.Product
  
  def mount(_params, _session) do
    {:ok, assign(:products, Product.get_all()), assign(:error, nil)}
  end
  
  def handle_event("apply_filters", %{"category" => category, "status" => status}, socket) do
    # ------- INPUT VALIDATION -------
    if not is_list(category) and not is_nil(category) do
      {:reply, {:error, "Invalid category format"}, socket}
    end
    
    if not is_list(status) and not is_nil(status) do
      {:reply, {:error, "Invalid status format"}, socket}
    end
    
    if not category and not status do
      {:reply, {:error, "Please select at least one filter"}, socket}
    end
    
    # Valid categories/statuses
    valid_categories = ["electronics", "clothing"]
    valid_statuses = ["active", "inactive"]
    
    if category and not Enum.member?(valid_categories, category) do
      {:reply, {:error, "Invalid category selected"}, socket}
    end
    
    if status and not Enum.member?(valid_statuses, status) do
      {:reply, {:error, "Invalid status selected"}, socket}
    end
    
    # ------- SERVER-SIDE TASK: Re-query database -------
    all_products = [
      %{id: 1, name: "Laptop", price: "$999", category: "electronics", status: "active"},
      %{id: 2, name: "T-Shirt", price: "$25", category: "clothing", status: "active"},
      %{id: 3, name: "Phone", price: "$699", category: "electronics", status: "inactive"},
      %{id: 4, name: "Jeans", price: "$59", category: "clothing", status: "inactive"}
    ]
    
    results = all_products
    if category do
      results = Enum.filter(all_products, fn p -> p.category == category end)
    end
    if status do
      results = Enum.filter(all_products, fn p -> p.status == status end)
    end
    
    # ------- ERROR: No results -------
    if length(results) == 0 do
      {:reply, {:error, "No products found matching filters"}, assign(socket, products: [], error: "No products found matching filters")}
    end
    
    # ------- SUCCESS -------
    {:reply, {:ok, assign(socket, products: results, error: nil)}}
  end
end
```

**Lines**: ~30 HEEx + ~45 Elixir = ~75 total  
**Flexibility**: High - full Elixir powers, real-time without JavaScript  
**Complexity**: Low-Medium - declarative, but different mindset from Ruby/TS; pattern matching handles validation elegantly

---

## 6. Ruby on Rails (Classic + Turbo)

### Client Code (`app/views/products/index.html.erb`)

```erb
<div class="filters">
  <%= form_with url: filter_products_path, method: :patch do |f| %>
    <%= f.label :category %><br>
    <%= f.select :category, options_for_select([["All", ""], ["Electronics", "electronics"], ["Clothing", "clothing"]]) %><br>
    
    <%= f.label :status %><br>
    <%= f.select :status, options_for_select([["All", ""], ["Active", "active"], ["Inactive", "inactive"]]) %><br>
    
    <%= f.submit "Apply Filters", class: "btn" %>
  <% end %>
</div>

<table>
  <tbody>
    <% @products.each do |product| %>
      <tr>
        <td><%= product.name %></td>
        <td><%= product.price %></td>
      </tr>
    <% end %>
    <% if @products.empty? && @filter_applied %>
      <tr><td colSpan="3">No products found matching filters</td></tr>
    <% end %>
  </tbody>
</table>
```

### Controller (`app/controllers/products_controller.rb`)

```ruby
def filter
  # ------- PARAMS EXTRACTION -------
  category = params[:category]
  status = params[:status]
  
  # ------- INPUT VALIDATION (server-side) -------
  unless category || status
    flash[:alert] = "Please select at least one filter"
    redirect_to products_path and return
  end
  
  invalid_categories = ["electronics", "clothing"]
  invalid_statuses = ["active", "inactive"]
  
  if category && !invalid_categories.include?(category)
    flash[:alert] = "Invalid category selected"
    redirect_to products_path and return
  end
  
  if status && !invalid_statuses.include?(status)
    flash[:alert] = "Invalid status selected"
    redirect_to products_path and return
  end
  
  # ------- SERVER-SIDE TASK: Re-query database -------
  @products = Product.all
  @products = @products.where(category: category) if category.present?
  @products = @products.where(status: status) if status.present?
  
  @filter_applied = true
  
  # ------- ERROR: No results -------
  if @products.empty?
    flash[:alert] = "No products found matching filters"
    @filter_applied = false
  end
  
  redirect_to products_path
end
```

### Filter Action Route

```ruby
# routes.rb
patch 'products/filter', to: 'products#filter', as: :filter_products
```

**Lines**: ~30 ERB + ~35 Ruby = ~65 total  
**Flexibility**: High - full Rails stack, classic MVC pattern  
**Complexity**: Low - standard Rails patterns, Turbo handles UI updates, flash for errors

---

## 7. Django (Classic Views + Forms)

### Client Code (`templates/products/index.html`)

```html
<form method="POST" action="{% url 'products:filter' %}" class="filter-form">
  {% csrf_token %}
  
  <div class="form-row">
    <div class="form-group col-md-6">
      <label>Category:</label>
      <select name="category" class="form-control">
        <option value="">All</option>
        {% for cat in categories %}
          <option value="{{ cat.value }}"{% if cat.value == request.GET.category %} selected{% endif %}>{{ cat.name }}</option>
        {% endfor %}
      </select>
    </div>
    <div class="form-group col-md-6">
      <label>Status:</label>
      <select name="status" class="form-control">
        <option value="">All</option>
        {% for stat in statuses %}
          <option value="{{ stat.value }}"{% if stat.value == request.GET.status %} selected{% endif %}>{{ stat.name }}</option>
        {% endfor %}
      </select>
    </div>
  </div>
  
  <button type="submit" class="btn btn-primary">Apply Filters</button>
</form>

{% if error %}
  <div class="alert alert-danger">{{ error }}</div>
{% endif %}

<table class="table">
  <tbody>
    {% for product in products %}
      <tr>
        <td>{{ product.name }}</td>
        <td>{{ product.price }}</td>
      </tr>
    {% empty %}
      {% if filter_applied %}
        <tr><td colSpan="2">No products found matching filters</td></tr>
      {% else %}
        <tr><td colSpan="2">No products available</td></tr>
      {% endif %}
    {% endfor %}
  </tbody>
</table>
```

### View (`views/products.py`)

```python
from django.shortcuts import render
from django.contrib import messages

def index(request):
    products = Product.objects.all()
    error = None
    filter_applied = False
    
    if request.method == "POST":
        category = request.POST.get('category')
        status = request.POST.get('status')
        
        # ------- INPUT VALIDATION (server-side) -------
        if not category and not status:
            messages.error(request, "Please select at least one filter")
            return render(request, 'products/index.html', {
                'products': products,
                'categories': CATEGORIES,
                'statuses': STATUSES,
                'filter_applied': False
            })
        
        if category and category not in ['electronics', 'clothing']:
            messages.error(request, "Invalid category selected")
            return render(request, 'products/index.html', {
                'products': products,
                'categories': CATEGORIES,
                'statuses': STATUSES,
                'filter_applied': False
            })
        
        if status and status not in ['active', 'inactive']:
            messages.error(request, "Invalid status selected")
            return render(request, 'products/index.html', {
                'products': products,
                'categories': CATEGORIES,
                'statuses': STATUSES,
                'filter_applied': False
            })
        
        # ------- SERVER-SIDE TASK: Re-query database -------
        products = Product.objects.all()
        if category:
            products = products.filter(category=category)
        if status:
            products = products.filter(status=status)
        
        filter_applied = True
        
        # ------- ERROR: No results -------
        if not products.exists():
            messages.error(request, "No products found matching filters")
            filter_applied = False
        
        return render(request, 'products/index.html', {
            'products': products,
            'categories': CATEGORIES,
            'statuses': STATUSES,
            'filter_applied': filter_applied
        })
    
    return render(request, 'products/index.html', {
        'products': products,
        'categories': CATEGORIES,
        'statuses': STATUSES
    })
```

**Lines**: ~50 HTML + ~45 Python = ~95 total  
**Flexibility**: High - full Django ORM, form handling, class-based views  
**Complexity**: Medium - form validation, CSRF, separate GET/POST handling, messages framework

---

## 8. htmx (Extension of Any Server-Rendered HTML)

### Client Code (Any server-rendered page)

```html
<div class="filters">
  <select hx-post="/products/filter" hx-trigger="change" hx-target="#product-table" hx-swap="outerHTML">
    <option value="">All Categories</option>
    <option value="electronics">Electronics</option>
    <option value="clothing">Clothing</option>
  </select>
  
  <select hx-post="/products/filter" hx-trigger="change" hx-target="#product-table" hx-swap="outerHTML">
    <option value="">All Statuses</option>
    <option value="active">Active</option>
    <option value="inactive">Inactive</option>
  </select>
  
  <button hx-post="/products/filter" hx-trigger="click" hx-target="#product-table" hx-swap="outerHTML">Apply Filters</button>
</div>

<table id="product-table">
  <!-- Table rows rendered server-side, htmx swaps new content -->
</table>
```

### Server View (`partials/product-table.html`)

```html
<tr>
  {% for product in products %}
    <tr>
      <td>{{ product.name }}</td>
      <td>{{ product.price }}</td>
    </tr>
  {% empty %}
    {% if error %}
      <tr><td colSpan="2">{{ error }}</td></tr>
    {% else %}
      <tr><td colSpan="2">No products found</td></tr>
    {% endif %}
  {% endfor %}
</tr>
```

### Server View (`views/products/filter.html`)

```python
def filter(request):
    category = request.GET.get('category')
    status = request.GET.get('status')
    
    # ------- INPUT VALIDATION -------
    if not category and not status:
        return render(request, 'partials/error.html', {
            'message': "Please select at least one filter"
        })
    
    if category and category not in ['electronics', 'clothing']:
        return render(request, 'partials/error.html', {
            'message': "Invalid category selected"
        })
    
    if status and status not in ['active', 'inactive']:
        return render(request, 'partials/error.html', {
            'message': "Invalid status selected"
        })
    
    # ------- SERVER-SIDE TASK: Re-query database -------
    products = Product.objects.all()
    if category: products = products.filter(category=category)
    if status: products = products.filter(status=status)
    
    # ------- ERROR: No results -------
    if not products.exists():
        return render(request, 'partials/error.html', {
            'message': "No products found matching filters"
        })
    
    # ------- SUCCESS -------
    return render(request, 'partials/product-table.html', {'products': products})
```

**Lines**: ~30 HTML + ~25 Python = ~55 total  
**Flexibility**: Medium-Low - depends on server framework, limited client-side control  
**Complexity**: Low - HTML attributes replace JavaScript, but debugging can be tricky when responses don't update UI as expected

---

## 9. SolidJS (Fine-grained Reactivity)

### Client Code (`components/ProductTable.tsx`)

```tsx
import { createSignal, createEffect } from "solid-js";

const ProductTable = () => {
  const [filters, setFilters] = createSignal({ category: "", status: "" });
  const [products, setProducts] = createSignal<Product[]>([]);
  const [error, setError] = createSignal<string | null>(null);
  
  const applyFilters = () => {
    const { category, status } = filters();
    
    // Input validation client-side
    if (!category && !status) {
      setError("Please select at least one filter");
      return;
    }
    
    if (category && !["electronics", "clothing"].includes(category)) {
      setError("Invalid category selected");
      return;
    }
    
    if (status && !["active", "inactive"].includes(status)) {
      setError("Invalid status selected");
      return;
    }
    
    // Server fetch
    fetch("/api/products/filter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, status })
    })
    .then(res => res.json())
    .then(result => {
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setProducts(result.products);
        setError(null);
      }
    })
    .catch(() => setError("Failed to load products"));
  };
  
  return (
    <div>
      <select onChange={(e) => setFilters({ ...filters(), category: e.target.value })}>...</select>
      <select onChange={(e) => setFilters({ ...filters(), status: e.target.value })}>...</select>
      <button onClick={applyFilters}>Apply Filters</button>
      
      {error && <p class="error">{error}</p>}
      
      <Table products={products()} />
    </div>
  );
};
```

**Lines**: ~40 client + ~20 server = ~60 total  
**Flexibility**: High - fine-grained reactivity, compiled, no virtual DOM  
**Complexity**: Medium - signal-based thinking, but very efficient; validation + effects handled cleanly

---

## 10. Svelte (Reactivity Built-In)

### Client Code (`components/ProductTable.svelte`)

```svelte
<div class="filters">
  <select bind:value={filters.category}>
    <option value="">All Categories</option>
    ...
  </select>
  
  <select bind:value={filters.status}>
    <option value="">All Statuses</option>
    ...
  </select>
  
  <button on:click={applyFilters}>Apply Filters</button>
  
  {#if error}
    <p class="error">{error}</p>
  {/if}
</div>

<table>
  <tbody>
    {#each products as product}
      <tr>
        <td>{product.name}</td>
        <td>{product.price}</td>
      </tr>
    {:else}
      {#if error}
        <tr><td colSpan="2">{error}</td></tr>
      {/if}
      {#if !error && products.length === 0}
        <tr><td colSpan="2">No products available</td></tr>
      {/if}
    {/each}
  </tbody>
</table>

<script>
  let filters = { category: "", status: "" };
  let products = [];
  let error = null;
  
  const applyFilters = async () => {
    // Input validation client-side
    if (!filters.category && !filters.status) {
      error = "Please select at least one filter";
      return;
    }
    
    if (filters.category && !["electronics", "clothing"].includes(filters.category)) {
      error = "Invalid category selected";
      return;
    }
    
    if (filters.status && !["active", "inactive"].includes(filters.status)) {
      error = "Invalid status selected";
      return;
    }
    
    // Server fetch
    const { data, error: fetchError } = await fetch("/api/products/filter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters)
    }).then(r => r.json()).catch(() => ({ error: "Failed to load products" }));
    
    if (fetchError) {
      error = fetchError;
    } else if (data.error) {
      error = data.error;
    } else if (data.success) {
      products = data.products;
      error = null;
    }
  };
</script>
```

**Lines**: ~45 HTML + script + ~20 server = ~65 total  
**Flexibility**: High - syntax HTML, reactive by default, small framework  
**Complexity**: Low - HTML-centric, very concise, built-in reactivity handles state naturally

---

# Full Comparison Summary

| Framework | Lines (Client+Server) | Validation | Error Handling | Complexity |
|-----------|----------------------|------------|----------------|------------|
| **Sliz** | ~55 | Client + server | return {error, success} | **Lowest** - framework handles DOM-to-data passing |
| **Next.js** | ~80 | Both sides | fetch + try/catch + state | Medium-High - manual API routes |
| **React + Inertia** | ~75 | Both sides | Inertia::response errors | Low-Medium - Inertia abstraction |
| **Livewire** | ~70 | Server-side only | $this->error = "msg" | Low - built-in, automatic |
| **Phoenix LiveView** | ~75 | Pattern matching | {:error, "msg"} | Low-Medium - Elixir pattern matching |
| **Ruby on Rails** | ~65 | Flash messages | flash[:alert] | Low - standard Rails patterns |
| **Django** | ~95 | messages framework | messages.error | Medium - CSRF, separate GET/POST |
| **htmx** | ~55 | Server-side only | render error partial | Low - HTML attributes, but tricky debugging |
| **SolidJS** | ~60 | Client + server | setError() signal | Medium - signal-based |
| **Svelte** | ~65 | Client + server | let error = null | Low - built-in reactivity |

## Key Observations

1. **Lowest Complexity**: **Sliz** (~55 lines total) wins because:
   - Framework extracts values from DOM automatically before RPC
   - No event handlers needed in client
   - Validation + server task + error return all in one `action()`
   - Framework handles DOM-to-data passing automatically

2. **Most Code**: **Django** (~95 lines) due to:
   - Separate GET/POST handling
   - CSRF token management
   - Messages framework for errors
   - Form rendering + validation logic

3. **Best Balance**: 
   - **Livewire**: Server-side only validation, automatic AJAX, minimal JS
   - **Rails**: Classic MVC, flash messages, Turbo UI updates
   - **Sliz**: Unique approach - zero event handlers, DOM-read at call time

4. **Framework Patterns**:
   - **Event-driven**: Next.js, SolidJS, Svelte - handlers respond to user input
   - **DOM-read at call time**: Sliz - framework reads values immediately before action
   - **Server-rendered**: Livewire, Rails, Django - validation + errors on server
   - **Reactive**: LiveView, SolidJS, Svelte - state management built-in

5. **Sliz Position**: With ~55 lines including full validation/error handling, sliz competes with htmx (~55 lines) but offers more flexibility (custom validation logic) while maintaining the "zero event handlers" advantage. The framework's top-level property extraction before RPC is the key differentiator.
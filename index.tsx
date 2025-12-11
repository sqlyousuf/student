import React, { useState, useEffect } from 'react';
import { Search, Plus, Check, X, Calendar, DollarSign, User, Phone, Mail, Edit2, Trash2, Users } from 'lucide-react';

export default function StudentFeeTracker() {
  const [families, setFamilies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFamily, setEditingFamily] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [formData, setFormData] = useState({
    parentName: '',
    email: '',
    phone: '',
    students: [{ name: '' }]
  });

  const feeStructure = {
    1: 75,
    2: 130,
    3: 195,
    4: 260
  };

  useEffect(() => {
    loadFamilies();
  }, []);

  const loadFamilies = async () => {
    try {
      const result = await window.storage.get('families');
      if (result) {
        setFamilies(JSON.parse(result.value));
      }
    } catch (error) {
      console.log('No existing data found');
    }
  };

  const saveFamilies = async (updatedFamilies) => {
    try {
      await window.storage.set('families', JSON.stringify(updatedFamilies));
      setFamilies(updatedFamilies);
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const getCurrentMonth = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const calculateMonthlyFee = (numStudents) => {
    return feeStructure[numStudents] || (numStudents > 4 ? 260 + (numStudents - 4) * 65 : 0);
  };

  const addStudent = () => {
    setFormData({
      ...formData,
      students: [...formData.students, { name: '' }]
    });
  };

  const removeStudent = (index) => {
    const newStudents = formData.students.filter((_, i) => i !== index);
    setFormData({ ...formData, students: newStudents });
  };

  const updateStudent = (index, field, value) => {
    const newStudents = [...formData.students];
    newStudents[index][field] = value;
    setFormData({ ...formData, students: newStudents });
  };

  const addOrUpdateFamily = () => {
    if (!formData.parentName) {
      alert('Please enter parent name');
      return;
    }

    const validStudents = formData.students.filter(s => s.name.trim());
    if (validStudents.length === 0) {
      alert('Please add at least one student');
      return;
    }

    const monthlyFee = calculateMonthlyFee(validStudents.length);

    let updatedFamilies;
    if (editingFamily) {
      updatedFamilies = families.map(f => 
        f.id === editingFamily.id 
          ? { 
              ...f, 
              parentName: formData.parentName,
              email: formData.email,
              phone: formData.phone,
              monthlyFee,
              students: validStudents.map((s, idx) => ({
                ...s,
                id: f.students[idx]?.id || Date.now() + idx,
                payments: f.students[idx]?.payments || []
              }))
            }
          : f
      );
    } else {
      const newFamily = {
        id: Date.now(),
        parentName: formData.parentName,
        email: formData.email,
        phone: formData.phone,
        monthlyFee,
        students: validStudents.map((s, idx) => ({
          ...s,
          id: Date.now() + idx,
          payments: []
        }))
      };
      updatedFamilies = [...families, newFamily];
    }

    saveFamilies(updatedFamilies);
    resetForm();
  };

  const deleteFamily = (id) => {
    if (confirm('Are you sure you want to delete this family?')) {
      const updatedFamilies = families.filter(f => f.id !== id);
      saveFamilies(updatedFamilies);
    }
  };

  const togglePayment = (familyId, month) => {
    const updatedFamilies = families.map(family => {
      if (family.id === familyId) {
        const payments = family.payments || [];
        const paymentIndex = payments.findIndex(p => p.month === month);
        
        if (paymentIndex > -1) {
          payments.splice(paymentIndex, 1);
        } else {
          payments.push({ month, date: new Date().toISOString() });
        }
        
        return { ...family, payments };
      }
      return family;
    });
    
    saveFamilies(updatedFamilies);
  };

  const hasPaymentForMonth = (family, month) => {
    return family.payments?.some(p => p.month === month) || false;
  };

  const resetForm = () => {
    setFormData({
      parentName: '',
      email: '',
      phone: '',
      students: [{ name: '' }]
    });
    setShowAddForm(false);
    setEditingFamily(null);
  };

  const startEdit = (family) => {
    setFormData({
      parentName: family.parentName,
      email: family.email,
      phone: family.phone,
      students: family.students.map(s => ({ name: s.name }))
    });
    setEditingFamily(family);
    setShowAddForm(true);
  };

  const filteredFamilies = families.filter(family => {
    const matchesSearch = family.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         family.students.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterStatus === 'paid') {
      return matchesSearch && hasPaymentForMonth(family, getCurrentMonth());
    } else if (filterStatus === 'unpaid') {
      return matchesSearch && !hasPaymentForMonth(family, getCurrentMonth());
    }
    return matchesSearch;
  });

  const totalStudents = families.reduce((sum, f) => sum + f.students.length, 0);
  const paidFamilies = families.filter(f => hasPaymentForMonth(f, getCurrentMonth()));
  const unpaidFamilies = families.filter(f => !hasPaymentForMonth(f, getCurrentMonth()));
  const monthlyRevenue = paidFamilies.reduce((sum, f) => sum + f.monthlyFee, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Student Fee Management</h1>
          <p className="text-gray-600">Track monthly payments by family - Auto-calculated fees</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Students</p>
                <p className="text-3xl font-bold text-gray-800">{totalStudents}</p>
              </div>
              <User className="text-blue-500" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Paid Families</p>
                <p className="text-3xl font-bold text-green-600">{paidFamilies.length}</p>
              </div>
              <Check className="text-green-500" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Unpaid Families</p>
                <p className="text-3xl font-bold text-red-600">{unpaidFamilies.length}</p>
              </div>
              <X className="text-red-500" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Revenue</p>
                <p className="text-3xl font-bold text-indigo-600">${monthlyRevenue}</p>
              </div>
              <DollarSign className="text-indigo-500" size={32} />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Fee Structure (Auto-calculated)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-white p-3 rounded-lg">
              <span className="font-semibold text-blue-700">1 Student:</span>
              <span className="ml-2 text-gray-700">$75/month</span>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <span className="font-semibold text-blue-700">2 Students:</span>
              <span className="ml-2 text-gray-700">$130/month</span>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <span className="font-semibold text-blue-700">3 Students:</span>
              <span className="ml-2 text-gray-700">$195/month</span>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <span className="font-semibold text-blue-700">4+ Students:</span>
              <span className="ml-2 text-gray-700">$260/month</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search families or students..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Families</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
              
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus size={20} />
                Add Family
              </button>
            </div>
          </div>

          {showAddForm && (
            <div className="border border-gray-200 rounded-lg p-6 mb-6 bg-gray-50">
              <h3 className="text-lg font-semibold mb-4">{editingFamily ? 'Edit Family' : 'Add New Family'}</h3>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2 text-gray-700">Parent Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Parent Name *"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.parentName}
                    onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-700">Students</h4>
                  <button
                    onClick={addStudent}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition"
                  >
                    <Plus size={16} />
                    Add Student
                  </button>
                </div>
                
                {formData.students.map((student, index) => (
                  <div key={index} className="flex gap-4 mb-3">
                    <input
                      type="text"
                      placeholder="Student Name *"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={student.name}
                      onChange={(e) => updateStudent(index, 'name', e.target.value)}
                    />
                    {formData.students.length > 1 && (
                      <button
                        onClick={() => removeStudent(index)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}

                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Monthly Fee: </span>
                    <span className="text-lg font-bold text-blue-700">
                      ${calculateMonthlyFee(formData.students.filter(s => s.name.trim()).length)}
                    </span>
                    <span className="text-gray-600 ml-2">
                      (for {formData.students.filter(s => s.name.trim()).length} student{formData.students.filter(s => s.name.trim()).length !== 1 ? 's' : ''})
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={addOrUpdateFamily}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  {editingFamily ? 'Update' : 'Add'} Family
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {filteredFamilies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No families found. Add your first family to get started!
              </div>
            ) : (
              filteredFamilies.map(family => {
                const isPaid = hasPaymentForMonth(family, getCurrentMonth());
                
                return (
                  <div key={family.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Users className="text-indigo-600" size={24} />
                          <h3 className="text-xl font-semibold text-gray-800">{family.parentName}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {isPaid ? 'Paid' : 'Unpaid'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          {family.email && (
                            <div className="flex items-center gap-1">
                              <Mail size={14} />
                              {family.email}
                            </div>
                          )}
                          {family.phone && (
                            <div className="flex items-center gap-1">
                              <Phone size={14} />
                              {family.phone}
                            </div>
                          )}
                          <div className="font-semibold text-indigo-700">
                            {family.students.length} student{family.students.length !== 1 ? 's' : ''} • ${family.monthlyFee}/month
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => togglePayment(family.id, getCurrentMonth())}
                          className={`px-5 py-2 rounded-lg font-medium transition ${
                            isPaid
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                        </button>
                        <button
                          onClick={() => startEdit(family)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => deleteFamily(family.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex flex-wrap gap-2">
                        {family.students.map(student => (
                          <span key={student.id} className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-700">
                            {student.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

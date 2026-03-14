import React, { useState } from 'react';

export const MedicationInventory = () => {
  const [medications, setMedications] = useState([
    {
      id: 1,
      name: 'Aspirin',
      dosage: '500mg',
      quantity: 50,
      expiry: '2025-12-31',
      status: 'In Stock',
    },
    {
      id: 2,
      name: 'Paracetamol',
      dosage: '1000mg',
      quantity: 30,
      expiry: '2025-06-30',
      status: 'In Stock',
    },
    {
      id: 3,
      name: 'Ibuprofen',
      dosage: '200mg',
      quantity: 5,
      expiry: '2025-03-31',
      status: 'Low Stock',
    },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    quantity: '',
    expiry: '',
  });

  const handleAddMedication = (e) => {
    e.preventDefault();
    if (newMed.name && newMed.dosage && newMed.quantity && newMed.expiry) {
      const medication = {
        id: medications.length + 1,
        ...newMed,
        quantity: parseInt(newMed.quantity),
        status: 'In Stock',
      };
      setMedications([...medications, medication]);
      setNewMed({ name: '', dosage: '', quantity: '', expiry: '' });
      setShowAddForm(false);
    }
  };

  const handleDeleteMedication = (id) => {
    setMedications(medications.filter((med) => med.id !== id));
  };

  return (
    <div className="dashboard-section">
      <div className="section-header">
        <h2>Medication Inventory</h2>
        <button
          className="btn btn-primary-small"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Cancel' : '+ Add Medication'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddMedication}>
          <div className="form-row">
            <div className="form-group">
              <label>Quantity</label>
              <input
                type="number"
                value={newMed.quantity}
                onChange={(e) => setNewMed({ ...newMed, quantity: e.target.value })}
                placeholder="0"
                required
              />
            </div>
            <div className="form-group">
              <label>Expiry Date</label>
              <input
                type="date"
                value={newMed.expiry}
                onChange={(e) => setNewMed({ ...newMed, expiry: e.target.value })}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            Add Medication
          </button>
        </form>
      )}
    </div>
  );
};
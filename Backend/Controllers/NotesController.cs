using Backend.Models;
using Chronote.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Chronote.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public NotesController(ApplicationDbContext context)
    {
        _context = context;
    }

    // Pobieranie wszystkich notatek (GET /api/notes)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Note>>> GetNotes()
    {
        return await _context.Notes
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();
    }

    // Pobieranie konkretnej notatki (GET /api/notes/{id})
    [HttpGet("{id}")]
    public async Task<ActionResult<Note>> GetNote(Guid id)
    {
        var note = await _context.Notes.FindAsync(id);

        if (note == null)
        {
            return NotFound();
        }

        return note;
    }

    // Tworzenie nowej notatki (POST /api/notes)
    [HttpPost]
    public async Task<ActionResult<Note>> CreateNote(Note note)
    {
        // Zabezpieczenie: nadpisujemy klucz i datę na backendzie
        note.Id = Guid.NewGuid();
        note.CreatedAt = DateTime.UtcNow;

        _context.Notes.Add(note);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetNote), new { id = note.Id }, note);
    }

    // Aktualizacja notatki (PUT /api/notes/{id})
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateNote(Guid id, Note updatedNote)
    {
        if (id != updatedNote.Id)
        {
            return BadRequest();
        }

        _context.Entry(updatedNote).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // Usuwanie notatki (DELETE /api/notes/{id})
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNote(Guid id)
    {
        var note = await _context.Notes.FindAsync(id);
        if (note == null)
        {
            return NotFound();
        }

        _context.Notes.Remove(note);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}